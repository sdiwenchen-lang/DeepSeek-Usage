/**
 * DeepMeter 本地数据源：把 DSH 会话日志折叠成面板能消费的按天/按小时视图。
 *
 * ## 为什么不用 TokenLedger / 不建 SQLite
 *
 * 会话日志本身就是事实来源，宿主 `sessionPersistence.list()` 返回
 * 每个日志的 header/revision，`open(id, 'read').read(0)` 能读完整事件。DSH 的会话规模在
 * 本机是几百个、十万级事件；每个会话只保留一张「小时 → 路由 → 计数」小表，
 * 查询时求和即可，不需要落库，也不需要另一个插件。
 *
 * 采用「整会话重折」而不是增量加减：一个会话的日志很小，重折成本可控；
 * 而跨日/跨模型替换样本时做减法，一旦漏掉一次就会永久污染总数。整会话替换
 * 让错误最多影响一个会话，下一次 revision 变化就会自愈。
 *
 * ## revision 缓存
 *
 * 一次 sweep 只重读 revision 变了的会话；revision 没变直接跳过。sweep 有
 * TTL 和 in-flight 去重，且只在面板请求时触发——不启动后台定时器。
 *
 * ## 时区
 *
 * 折叠依赖 tz（小时/日边界）。面板固定带本地 tz，但接口允许不同 tz；
 * 因此 state 按 tz 分开缓存，切 tz 时重新折一遍。这是有意的取舍：
 * 比“存 UTC 小时、查询时再拆”更简单，也不会在 30/45 分钟偏移时切错。
 *
 * @module deepseek-usage/local
 */

import { cacheHitRate, foldSession, parseRouteKey, totalTokens, zeroBuckets } from "./local-fold.js";
import { createPricing, WINDOW_FIELDS } from "./pricing.js";

export const DEFAULT_OFFICIAL_PROVIDERS = ["deepseek-official", "deepseek-account", "deepseek"];

const DAY_MS = 86_400_000;
const MAX_RANGE_DAYS = 800;

function localError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

function localDayOf(ms, tz) {
  return new Date(ms + tz * 1000).toISOString().slice(0, 10);
}

/**
 * 兼容两种宿主形状：
 * - 现行服务：`list()` + `open(id, 'read')` + `reader.read(0)` + `reader.close()`
 * - 早期原型：`listSnapshots()` + `readFrom(id, 0)`（测试与旧宿主用）
 *
 * 前者是 DSH 文档里的五个服务方法之一；不要直接假设 `listSnapshots` 存在。
 */
async function listSnapshotsOf(persistence) {
  if (typeof persistence.listSnapshots === "function") return persistence.listSnapshots();
  if (typeof persistence.list === "function") {
    const list = await persistence.list();
    return Array.isArray(list) ? list : list?.snapshots ?? [];
  }
  throw new Error("session persistence has no list method");
}

async function readSessionEvents(persistence, sessionId) {
  if (typeof persistence.readFrom === "function") {
    const result = await persistence.readFrom(sessionId, 0);
    return result?.events ?? [];
  }
  if (typeof persistence.open !== "function") {
    throw new Error("session persistence has no open/readFrom method");
  }
  const reader = await persistence.open(sessionId, "read");
  try {
    const result = await reader.read(0);
    return result?.events ?? [];
  } finally {
    try {
      await reader.close?.();
    } catch {
      // 关闭失败不应让已经读到的事件作废。
    }
  }
}

function localHourOf(ms, tz) {
  return Number(new Date(ms + tz * 1000).toISOString().slice(11, 13));
}

function round2(value) {
  return Math.round(value * 100) / 100;
}

function pad2(value) {
  return String(value).padStart(2, "0");
}

function rangeDates(from, to) {
  const dates = [];
  const start = Date.parse(`${from}T00:00:00Z`);
  const end = Date.parse(`${to}T00:00:00Z`);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return dates;
  for (let cursor = start; cursor <= end && dates.length < MAX_RANGE_DAYS; cursor += DAY_MS) {
    dates.push(new Date(cursor).toISOString().slice(0, 10));
  }
  return dates;
}

function blankWindows() {
  const windows = {};
  for (const field of WINDOW_FIELDS) windows[field] = 0;
  return windows;
}

function addWindows(target, source) {
  for (const field of WINDOW_FIELDS) {
    if (source[field] !== undefined) target[field] = (target[field] ?? 0) + source[field];
  }
}

function aggregate(state, options) {
  const { from, to, tz, scope, granularity, now, officialProviders, pricing } = options;
  const points = new Map();
  const models = new Map();
  const providers = new Map();
  const totals = { ...zeroBuckets(), ...blankWindows(), cost: 0, pricedTokens: 0, unpricedTokens: 0 };
  let firstAt = null;
  let lastAt = null;

  const pointFor = (key, date, hour) => {
    let point = points.get(key);
    if (point === undefined) {
      point = {
        key,
        date,
        ...(granularity === "hour" ? { hour, label: `${pad2(hour)}:00` } : {}),
        hit: 0,
        miss: 0,
        cacheWrite: 0,
        output: 0,
        requests: 0,
        tokens: 0,
        cost: 0,
        pricedTokens: 0,
        unpricedTokens: 0,
        ...blankWindows(),
        models: new Map(),
      };
      points.set(key, point);
    }
    return point;
  };

  for (const session of state.sessions.values()) {
    if (session.firstAt !== null && (firstAt === null || session.firstAt < firstAt)) firstAt = session.firstAt;
    if (session.lastAt !== null && (lastAt === null || session.lastAt > lastAt)) lastAt = session.lastAt;

    for (const [hour, routes] of session.hours) {
      const date = hour.slice(0, 10);
      if (date < from || date > to) continue;
      if (granularity === "hour" && date !== from) continue;

      const key = granularity === "hour" ? hour : date;
      const point = pointFor(key, date, granularity === "hour" ? Number(hour.slice(11, 13)) : undefined);

      for (const [keyOfRoute, buckets] of routes) {
        const { provider, model } = parseRouteKey(keyOfRoute);
        if (scope !== "all" && !officialProviders.has(provider)) continue;

        for (const field of ["hit", "miss", "cacheWrite", "output", "requests"]) {
          point[field] += buckets[field];
          totals[field] += buckets[field];
        }
        const quote = pricing.quote(model, buckets);
        const cost = quote.cost ?? 0;
        const pricedTokens = quote.pricedTokens;
        const unpricedTokens = quote.unpricedTokens;
        addWindows(point, buckets);
        addWindows(totals, buckets);
        point.cost += cost;
        point.pricedTokens += pricedTokens;
        point.unpricedTokens += unpricedTokens;
        totals.cost += cost;
        totals.pricedTokens += pricedTokens;
        totals.unpricedTokens += unpricedTokens;

        const pointModel = point.models.get(model) ?? {
          model,
          tokens: 0,
          requests: 0,
          hit: 0,
          miss: 0,
          output: 0,
          cost: 0,
          pricedTokens: 0,
          unpricedTokens: 0,
          ...blankWindows(),
        };
        pointModel.tokens += totalTokens(buckets);
        pointModel.requests += buckets.requests;
        pointModel.hit += buckets.hit;
        pointModel.miss += buckets.miss;
        pointModel.output += buckets.output;
        pointModel.cost += cost;
        pointModel.pricedTokens += pricedTokens;
        pointModel.unpricedTokens += unpricedTokens;
        addWindows(pointModel, buckets);
        point.models.set(model, pointModel);

        const globalModel = models.get(model) ?? {
          model,
          tokens: 0,
          requests: 0,
          cost: 0,
          pricedTokens: 0,
          unpricedTokens: 0,
          ...blankWindows(),
        };
        globalModel.tokens += totalTokens(buckets);
        globalModel.requests += buckets.requests;
        globalModel.cost += cost;
        globalModel.pricedTokens += pricedTokens;
        globalModel.unpricedTokens += unpricedTokens;
        addWindows(globalModel, buckets);
        models.set(model, globalModel);

        const globalProvider = providers.get(provider) ?? {
          provider,
          tokens: 0,
          requests: 0,
          cost: 0,
          pricedTokens: 0,
          unpricedTokens: 0,
          ...blankWindows(),
          scope: officialProviders.has(provider) ? "official" : "other",
        };
        globalProvider.tokens += totalTokens(buckets);
        globalProvider.requests += buckets.requests;
        globalProvider.cost += cost;
        globalProvider.pricedTokens += pricedTokens;
        globalProvider.unpricedTokens += unpricedTokens;
        addWindows(globalProvider, buckets);
        providers.set(provider, globalProvider);
      }
    }
  }

  // 补齐空日期/空小时，保证图表横轴连续。
  const dates = rangeDates(from, to);
  const today = localDayOf(now, tz);
  for (const date of dates) {
    if (granularity === "day") {
      pointFor(date, date);
      continue;
    }
    const limit = date === today ? localHourOf(now, tz) : 23;
    for (let hour = 0; hour <= limit; hour += 1) {
      pointFor(`${date}T${pad2(hour)}`, date, hour);
    }
  }

  const ordered = [...points.values()]
    .map((point) => {
      point.tokens = totalTokens(point);
      point.hitRate = cacheHitRate(point);
      point.cost = round2(point.cost);
      point.costComplete = point.unpricedTokens === 0;
      point.models = [...point.models.values()].sort((a, b) => b.tokens - a.tokens).map((model) => ({
        ...model,
        cost: round2(model.cost),
        costComplete: model.unpricedTokens === 0,
      }));
      return point;
    })
    .sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));

  const orderedModels = [...models.values()].sort((a, b) => b.tokens - a.tokens).map((model) => ({
    ...model,
    cost: round2(model.cost),
    costComplete: model.unpricedTokens === 0,
  }));
  const orderedProviders = [...providers.values()].sort((a, b) => b.tokens - a.tokens).map((provider) => ({
    ...provider,
    cost: round2(provider.cost),
    costComplete: provider.unpricedTokens === 0,
  }));
  const total = { ...totals, tokens: totalTokens(totals), hitRate: cacheHitRate(totals), cost: round2(totals.cost) };

  return {
    points: ordered,
    models: orderedModels,
    providers: orderedProviders,
    totals: total,
    tokens: {
      total: total.tokens,
      hit: total.hit,
      miss: total.miss,
      output: total.output,
      hitRate: total.hitRate,
    },
    requests: total.requests,
    cost: total.cost,
    pricedTokens: total.pricedTokens,
    unpricedTokens: total.unpricedTokens,
    firstAt,
    lastAt,
  };
}

/**
 * @param {{
 *   persistence?: {
 *     list?: Function, listSnapshots?: Function,
 *     open?: Function, readFrom?: Function
 *   },
 *   logger?: any,
 *   config?: {
 *     officialProviders?: string[],
 *     sweepTtlMs?: number,
 *     maxSessions?: number,
 *     pricing?: object
 *   }
 * }} deps
 */
export function createLocalSource(deps = {}) {
  const { persistence, logger } = deps;
  const config = deps.config ?? {};
  const officialProviders = new Set(config.officialProviders ?? DEFAULT_OFFICIAL_PROVIDERS);
  const ttlMs = config.sweepTtlMs ?? 30_000;
  const maxSessions = config.maxSessions ?? 5_000;
  const pricing = createPricing(config.pricing ?? {});

  /** tz -> { sessions, lastSweepAt, failed, ... } */
  const byTz = new Map();

  function stateFor(tz) {
    let state = byTz.get(tz);
    if (state === undefined) {
      state = {
        sessions: new Map(),
        lastSweepAt: 0,
        failed: 0,
        truncated: false,
        available: persistence != null,
        error: null,
        sweeping: null,
      };
      byTz.set(tz, state);
    }
    return state;
  }

  async function doSweep(state, tz) {
    if (persistence == null) {
      state.available = false;
      state.error = "local-unavailable";
      state.lastSweepAt = Date.now();
      return state;
    }

    let snapshots;
    try {
      snapshots = await listSnapshotsOf(persistence);
    } catch (error) {
      state.available = false;
      state.error = "list-failed";
      state.lastSweepAt = Date.now();
      logger?.warn?.("deepseek-usage.local: list failed: %s", error?.message ?? error);
      return state;
    }

    state.available = true;
    state.error = null;

    const seen = new Set();
    let failed = 0;
    let truncated = false;
    let list = Array.isArray(snapshots) ? snapshots : [];
    if (list.length > maxSessions) {
      truncated = true;
      list = [...list]
        .sort((a, b) => (b?.header?.createdAt ?? 0) - (a?.header?.createdAt ?? 0))
        .slice(0, maxSessions);
    }

    for (const snapshot of list) {
      const sessionId = snapshot?.header?.id ?? snapshot?.id ?? snapshot?.sessionId;
      if (sessionId === undefined) {
        failed += 1;
        continue;
      }
      seen.add(sessionId);

      const revision = snapshot?.revision === undefined ? undefined : String(snapshot.revision);
      const previous = state.sessions.get(sessionId);
      if (previous !== undefined && revision !== undefined && previous.revision === revision) {
        continue;
      }

      try {
        const events = await readSessionEvents(persistence, sessionId);
        const folded = foldSession(events, { tz, pricing });
        state.sessions.set(sessionId, {
          sessionId,
          revision,
          header: snapshot?.header,
          ...folded,
        });
      } catch (error) {
        failed += 1;
        logger?.warn?.(
          "deepseek-usage.local: session %s failed: %s",
          sessionId,
          error?.message ?? error
        );
      }
    }

    // 已被清理/移走的会话不再计入。
    for (const sessionId of [...state.sessions.keys()]) {
      if (!seen.has(sessionId)) state.sessions.delete(sessionId);
    }

    state.failed = failed;
    state.truncated = truncated;
    state.lastSweepAt = Date.now();
    return state;
  }

  async function ensureFresh(tz, force) {
    const state = stateFor(tz);
    if (!force && state.lastSweepAt > 0 && Date.now() - state.lastSweepAt < ttlMs) {
      return state;
    }
    if (state.sweeping !== null) return state.sweeping;
    state.sweeping = doSweep(state, tz).finally(() => {
      state.sweeping = null;
    });
    return state.sweeping;
  }

  function coverageOf(state, tz, scope) {
    let sessionsWithUsage = 0;
    let sessionsWithSubagent = 0;
    let firstAt = null;
    let lastAt = null;
    for (const session of state.sessions.values()) {
      if (session.samples > 0) sessionsWithUsage += 1;
      if (session.header?.parentSession !== undefined || session.header?.origin === "subagent") {
        sessionsWithSubagent += 1;
      }
      if (session.firstAt !== null && (firstAt === null || session.firstAt < firstAt)) firstAt = session.firstAt;
      if (session.lastAt !== null && (lastAt === null || session.lastAt > lastAt)) lastAt = session.lastAt;
    }
    return {
      sessions: state.sessions.size,
      sessionsWithUsage,
      sessionsWithSubagent,
      failed: state.failed,
      truncated: state.truncated,
      firstAt,
      lastAt,
      scope,
      tz,
      lastSweepAt: state.lastSweepAt,
      error: state.error,
    };
  }

  /**
   * 查询一个范围。
   *
   * @param {{
   *   from: string, to: string, tz?: number,
   *   scope?: "deepseek"|"all",
   *   granularity?: "day"|"hour",
   *   now?: number, force?: boolean, range?: string
   * }} options
   */
  async function query(options = {}) {
    const tz = options.tz ?? 0;
    const scope = options.scope === "deepseek" ? "deepseek" : "all";
    const granularity = options.granularity === "hour" ? "hour" : "day";
    const now = options.now ?? Date.now();
    const from = options.from;
    const to = options.to;
    if (typeof from !== "string" || typeof to !== "string" || from > to) {
      throw localError("bad-range", "invalid range");
    }

    const state = await ensureFresh(tz, options.force === true);
    if (persistence == null || (!state.available && state.sessions.size === 0)) {
      throw localError("local-unavailable", "session persistence is not available");
    }

    const activePricing = options.rates
      ? createPricing({
        ...(config.pricing ?? {}),
        models: { ...(config.pricing?.models ?? {}), ...options.rates },
        source: "自定义费率",
      })
      : pricing;
    const aggregated = aggregate(state, {
      from,
      to,
      tz,
      scope,
      granularity,
      now,
      officialProviders,
      pricing: activePricing,
    });

    return {
      ok: true,
      source: "local",
      fetchedAt: now,
      range: options.range ?? "custom",
      window: { from, to },
      granularity,
      points: aggregated.points,
      days: aggregated.points,
      models: aggregated.models,
      providers: aggregated.providers,
      totals: aggregated.totals,
      tokens: aggregated.tokens,
      requests: aggregated.totals.requests,
      coverage: coverageOf(state, tz, scope),
      cost: aggregated.pricedTokens > 0 ? round2(aggregated.cost) : null,
      costMeta: {
        ...activePricing.meta(),
        estimated: true,
        pricedTokens: aggregated.pricedTokens,
        unpricedTokens: aggregated.unpricedTokens,
        complete: aggregated.unpricedTokens === 0,
        unpricedModels: aggregated.models
          .filter((model) => model.unpricedTokens > 0)
          .map((model) => model.model),
      },
      latencyNote: "本地会话日志，实时；费用按当前费率估算，实际以官方账单为准",
    };
  }

  function status(tz = 0) {
    const state = stateFor(tz);
    return {
      ...coverageOf(state, tz, "all"),
      available: persistence != null,
    };
  }

  function clear() {
    byTz.clear();
  }

  return { query, status, clear, sweep: (tz = 0, force = true) => ensureFresh(tz, force) };
}
