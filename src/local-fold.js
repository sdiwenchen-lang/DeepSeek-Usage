/**
 * 本地会话日志的 Token 折叠。
 *
 * ## 口径
 *
 * 对齐 `@deepseek-ai/dsh-token-meter` 的 `tokenUsage` projection：
 *
 * - 四个桶互斥：未命中输入、缓存命中、缓存写入、输出。`reasoningTokens`
 *   是输出的子集，只展示，不再加。
 * - 同一 `(turn, step)` 的重复样本是**替换**，不是累加。后来的样本先把旧样本
 *   从原归属的小时/路由里减掉，再记新样本。
 * - `assistant/chunk` 的 `{type:'usage'}` 和 `assistant/message` 的
 *   `data.usage` 都要收：请求报出 usage 后失败，永远等不到 message，
 *   但供应商已经计费。
 * - chunk 没有 provider/model，回退到最近一次 `request/header.data.header.config`；
 *   message 用 `data.message.source`。归不上的记 `unknown`，不猜。
 * - 按宿主本地时区切小时/日；`tz` 是秒偏移，和官方接口一致。
 *
 * ## 为什么以「小时」为最小桶
 *
 * 面板既要「今天/昨天按小时」，又要「近 30 天按天」。只存小时桶，
 * 按天查询时把小时相加即可；反过来只存日桶，小时视图就没了。
 *
 * 一个会话的桶只保留 `小时 → 路由 → 计数`，不保留事件、prompt、工具参数。
 *
 * @module deepseek-usage/local-fold
 */

/** DSH 没有报 provider/model 时的占位。 */
export const UNKNOWN = "unknown";

/** 路由键分隔符（不会出现在 provider/model 名里）。 */
const SEP = "\u0000";

/** 空计数桶。 */
export function zeroBuckets() {
  return { hit: 0, miss: 0, cacheWrite: 0, output: 0, requests: 0 };
}

/** 把 source 加到 target 上，返回 target。 */
export function addBuckets(target, source) {
  target.hit += source.hit;
  target.miss += source.miss;
  target.cacheWrite += source.cacheWrite;
  target.output += source.output;
  target.requests += source.requests;
  return target;
}

/** 从 target 里减掉 source，返回 target。 */
export function subtractBuckets(target, source) {
  target.hit -= source.hit;
  target.miss -= source.miss;
  target.cacheWrite -= source.cacheWrite;
  target.output -= source.output;
  target.requests -= source.requests;
  return target;
}

/** 计费 Tokens：四桶相加。 */
export function totalTokens(buckets) {
  return buckets.hit + buckets.miss + buckets.cacheWrite + buckets.output;
}

/** 缓存命中率（0–100，保留一位小数）；没有 prompt 侧 token 时为 null。 */
export function cacheHitRate(buckets) {
  const prompt = buckets.hit + buckets.miss + buckets.cacheWrite;
  if (prompt <= 0) return null;
  return Math.round((buckets.hit / prompt) * 1000) / 10;
}

/** 本地日历日 `YYYY-MM-DD`（tz 为秒偏移）。 */
export function dayKey(timeMs, tz = 0) {
  return new Date(timeMs + tz * 1000).toISOString().slice(0, 10);
}

/** 本地小时 `YYYY-MM-DDTHH`（tz 为秒偏移）。 */
export function hourKey(timeMs, tz = 0) {
  return new Date(timeMs + tz * 1000).toISOString().slice(0, 13);
}

/** `routeKey` 的稳定表示。 */
export function routeKey(provider, model) {
  return `${provider}${SEP}${model}`;
}

/** 拆回 `{ provider, model }`；未知字段落到 `unknown`。 */
export function parseRouteKey(key) {
  const index = key.indexOf(SEP);
  if (index < 0) return { provider: key || UNKNOWN, model: UNKNOWN };
  return {
    provider: key.slice(0, index) || UNKNOWN,
    model: key.slice(index + SEP.length) || UNKNOWN,
  };
}

function numberOrZero(value) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function sampleOf(event) {
  if (event?.type === "assistant/chunk" && event.data?.chunk?.type === "usage") {
    return {
      key: stepKey(event),
      usage: event.data.chunk.usage,
    };
  }
  if (event?.type === "assistant/message" && event.data?.usage !== undefined) {
    return {
      key: stepKey(event),
      usage: event.data.usage,
    };
  }
  return undefined;
}

function stepKey(event) {
  const turn = event.data?.turn;
  const step = event.data?.step;
  if (Number.isFinite(turn) && Number.isFinite(step)) return `${turn}:${step}`;
  return `seq:${event.seq ?? "?"}`;
}

function provenanceOf(event) {
  const source = event?.data?.message?.source;
  if (source !== undefined && typeof source.model === "string") {
    return {
      provider:
        typeof source.provider === "string" && source.provider.length > 0
          ? source.provider
          : UNKNOWN,
      model: source.model,
    };
  }
  const config = event?.data?.header?.config;
  if (config !== undefined && typeof config.model === "string") {
    return {
      provider:
        typeof config.provider === "string" && config.provider.length > 0
          ? config.provider
          : UNKNOWN,
      model: config.model,
    };
  }
  return undefined;
}

function bucketsOf(usage) {
  return {
    hit: numberOrZero(usage?.cacheReadTokens),
    miss: numberOrZero(usage?.inputTokens),
    cacheWrite: numberOrZero(usage?.cacheWriteTokens),
    output: numberOrZero(usage?.outputTokens),
    requests: 1,
  };
}

function addRoute(hours, hour, key, buckets) {
  let routes = hours.get(hour);
  if (routes === undefined) {
    routes = new Map();
    hours.set(hour, routes);
  }
  let target = routes.get(key);
  if (target === undefined) {
    target = zeroBuckets();
    routes.set(key, target);
  }
  addBuckets(target, buckets);
}

function removeRoute(hours, hour, key, buckets) {
  const routes = hours.get(hour);
  if (routes === undefined) return;
  const target = routes.get(key);
  if (target === undefined) return;
  subtractBuckets(target, buckets);
  if (target.requests <= 0 && totalTokens(target) <= 0) {
    routes.delete(key);
  }
  if (routes.size === 0) hours.delete(hour);
}

/**
 * 折叠一个会话的完整事件列表。
 *
 * @param {Array<object>} events 持久化的 SessionEvent 列表（seq 顺序）
 * @param {{ tz?: number, now?: number }} [options]
 *   折叠只保存四个 token 桶；费率与汇率在查询时应用。
 * @returns {{
 *   hours: Map<string, Map<string, object>>,
 *   samples: number,
 *   firstAt: number | null,
 *   lastAt: number | null,
 *   unattributed: number
 * }}
 */
export function foldSession(events, options = {}) {
  const tz = options.tz ?? 0;
  const now = options.now ?? Date.now();
  const hours = new Map();
  let last = null;
  let route = null;
  let firstAt = null;
  let lastAt = null;
  let unattributed = 0;

  for (const event of events ?? []) {
    if (event?.type === "request/header") {
      const provenance = provenanceOf(event);
      if (provenance !== undefined) route = provenance;
      continue;
    }

    const sample = sampleOf(event);
    if (sample === undefined) continue;

    const provenance = provenanceOf(event) ?? route;
    const provider = provenance?.provider ?? UNKNOWN;
    const model = provenance?.model ?? UNKNOWN;
    if (provider === UNKNOWN || model === UNKNOWN) unattributed += 1;

    const key = routeKey(provider, model);
    const time = Number.isFinite(event.time) ? event.time : now;
    const hour = hourKey(time, tz);
    const buckets = bucketsOf(sample.usage);

    if (last !== null && last.key === sample.key) {
      // 同一 (turn, step) 的最终样本替换早先的 chunk 样本：先从旧归属扣除。
      removeRoute(hours, last.hour, last.route, last.buckets);
    }

    addRoute(hours, hour, key, buckets);

    if (typeof event.time === "number" && Number.isFinite(event.time)) {
      if (firstAt === null || event.time < firstAt) firstAt = event.time;
      if (lastAt === null || event.time > lastAt) lastAt = event.time;
    }

    last = { key: sample.key, hour, route: key, buckets };
  }

  let samples = 0;
  for (const routes of hours.values()) {
    for (const buckets of routes.values()) samples += buckets.requests;
  }

  return { hours, samples, firstAt, lastAt, unattributed };
}
