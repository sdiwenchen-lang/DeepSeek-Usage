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
import { analyzeCache, createPricing } from "./pricing.js";

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

function aggregate(state, options) {
  const { from, to, tz, scope, granularity, now, officialProviders, pricing } = options;
  const points = new Map(), models = new Map(), providers = new Map();
  const accumulator = (extra = {}) => ({ ...zeroBuckets(), cost: 0, usd: 0, pricedTokens: 0, unpricedTokens: 0, ...extra });
  const totals = accumulator();
  let firstAt = null, lastAt = null;
  const pointFor = (key, date, hour) => {
    if (!points.has(key)) points.set(key, accumulator({ key, date,
      ...(granularity === "hour" ? { hour, label: pad2(hour) + ":00" } : {}), models: new Map() }));
    return points.get(key);
  };
  const add = (target, buckets, quote) => {
    for (const field of ["hit", "miss", "cacheWrite", "output", "requests"]) target[field] += buckets[field];
    target.usd += quote.usd ?? 0;
    target.cost += quote.cost ?? 0;
    target.pricedTokens += quote.pricedTokens;
    target.unpricedTokens += quote.unpricedTokens;
  };
  const fxReady = pricing.meta().fxReady;
  const finish = (row) => {
    const tokens = totalTokens(row);
    return { ...row, tokens, hitRate: cacheHitRate(row),
      usd: tokens === 0 || row.pricedTokens > 0 ? row.usd : null,
      cost: tokens === 0 ? 0 : row.pricedTokens > 0 && fxReady ? row.cost : null,
      costComplete: row.unpricedTokens === 0 };
  };
  for (const session of state.sessions.values()) {
    if (session.firstAt !== null && (firstAt === null || session.firstAt < firstAt)) firstAt = session.firstAt;
    if (session.lastAt !== null && (lastAt === null || session.lastAt > lastAt)) lastAt = session.lastAt;
    for (const [hour, routes] of session.hours) {
      const date = hour.slice(0, 10);
      if (date < from || date > to) continue;
      const point = pointFor(granularity === "hour" ? hour : date, date, Number(hour.slice(11, 13)));
      for (const [route, buckets] of routes) {
        const { provider, model } = parseRouteKey(route);
        if (scope !== "all" && !officialProviders.has(provider)) continue;
        const quote = pricing.quote(model, buckets);
        const pointModel = point.models.get(model) ?? accumulator({ model });
        const globalModel = models.get(model) ?? accumulator({ model });
        const globalProvider = providers.get(provider) ?? accumulator({ provider, scope: officialProviders.has(provider) ? "official" : "other" });
        for (const target of [point, pointModel, globalModel, globalProvider, totals]) add(target, buckets, quote);
        point.models.set(model, pointModel);
        models.set(model, globalModel);
        providers.set(provider, globalProvider);
      }
    }
  }
  const today = localDayOf(now, tz);
  for (const date of rangeDates(from, to)) {
    if (granularity === "day") { pointFor(date, date); continue; }
    const limit = date > today ? 23 : date === today ? localHourOf(now, tz) : 23;
    for (let hour = 0; hour <= limit; hour++) pointFor(date + "T" + pad2(hour), date, hour);
  }
  const sorted = (rows) => [...rows].map(finish).sort((a, b) => b.tokens - a.tokens);
  const orderedModels = sorted(models.values());
  const total = finish(totals);
  return { points: [...points.values()].map((point) => ({ ...finish(point), models: sorted(point.models.values()) }))
      .sort((a, b) => a.key.localeCompare(b.key)),
    models: orderedModels, providers: sorted(providers.values()), totals: total,
    tokens: { total: total.tokens, hit: total.hit, miss: total.miss, cacheWrite: total.cacheWrite, output: total.output, hitRate: total.hitRate },
    requests: total.requests, cost: total.cost, usd: total.usd,
    pricedTokens: total.pricedTokens, unpricedTokens: total.unpricedTokens,
    cache: analyzeCache(orderedModels, pricing.enabled ? pricing.pricer : null), firstAt, lastAt };
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
        const folded = foldSession(events, { tz });
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
        ...options.rates,
        // 浏览器留空（0）只表示“未自定义”，保留服务端配置；两边都没有汇率时不换算。
        usdToCny: options.rates.usdToCny > 0 ? options.rates.usdToCny : config.pricing?.usdToCny,
        models: { ...(config.pricing?.models ?? {}), ...(options.rates.models ?? {}) },
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
      cost: aggregated.cost,
      usd: aggregated.usd,
      cache: aggregated.cache,
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

  return { query, status, clear, pricing, sweep: (tz = 0, force = true) => ensureFresh(tz, force) };
}
