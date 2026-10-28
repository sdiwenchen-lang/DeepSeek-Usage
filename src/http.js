/**
 * 回环端点：浏览器面板读取数据的唯一入口。
 *
 * ## 为什么需要自己的栅栏
 *
 * `webServer.register({ kind: 'exact' })` 的优先级高于 RPC 前缀，
 * 这些路由位于 RPC 信任边界**之外**。上游不会替我们校验调用方，
 * 所以处理器自己做，且基于 peer socket 地址而非 Host 头：
 * 头是客户端填的，socket 的远端地址是观测到的。
 *
 * ## 为什么端点返回的就是聚合后的全量
 *
 * 一次请求而非六次：面板作为整体渲染，多次请求会让各区块互相不一致。
 * 聚合规则对齐 PRD §6：token 计费输入 = hit + miss；output 单列；
 * hitRate = hit / (hit + miss)。
 *
 * @module dsh-deepseek-usage/http
 */

import { createRequire } from "node:module";
import { readFileSync, statSync } from "node:fs";

import { UpstreamAuthError } from "./apiclient.js";
import { buildReconcilePayload } from "./reconcile.js";

export const VERSION = (() => {
  try {
    return createRequire(import.meta.url)("../package.json").version;
  } catch {
    return "unknown";
  }
})();

/** 路由前缀。exact 注册，每条 path 显式写。 */
export const BASE_PATH = "/api/deepseek-usage";
export const SUMMARY_PATH = `${BASE_PATH}/summary`;
export const OFFICIAL_PATH = `${BASE_PATH}/official`;
export const LOCAL_PATH = `${BASE_PATH}/local`;
export const RECONCILE_PATH = `${BASE_PATH}/reconcile`;
export const STATUS_PATH = `${BASE_PATH}/status`;
export const PANEL_CSS_PATH = `${BASE_PATH}/panel.css`;

/* ---------------- 回环栅栏 ---------------- */

/**
 * 判断裸地址是否回环。
 * IPv6-mapped IPv4（`::ffff:127.0.0.1`）是 Node 在双栈监听器上报告的形式。
 */
export function isLoopbackAddress(address) {
  if (typeof address !== "string" || address === "") return false;
  const bare = address.startsWith("::ffff:") ? address.slice(7) : address;
  if (bare === "::1" || bare === "localhost") return true;
  return /^127\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(bare);
}

/** Host 头去掉端口，容忍方括号 IPv6 字面量。 */
export function hostNameOf(header) {
  if (typeof header !== "string" || header === "") return "";
  if (header.startsWith("[")) return header.slice(1, header.indexOf("]"));
  const colon = header.lastIndexOf(":");
  return colon === -1 ? header : header.slice(0, colon);
}

/** 不带 query 的 path。 */
export function pathOf(url) {
  try {
    return new URL(url ?? "/", "http://localhost").pathname;
  } catch {
    return "";
  }
}

/**
 * 判断请求是否可被服务。
 * @returns `undefined` 放行，否则 `{ status, body }`。
 */
export function screenRequest(req) {
  const method = req?.method;
  if (method !== "GET") return { status: 405, body: { ok: false, error: "method-not-allowed" } };
  const peerOk = isLoopbackAddress(req.socket?.remoteAddress);
  const hostOk = isLoopbackAddress(hostNameOf(req.headers?.host));
  if (peerOk && hostOk) return undefined;
  return { status: 403, body: { ok: false, error: "forbidden" } };
}

/* ---------------- query 解析 ---------------- */

export function summaryQuery(url) {
  let p;
  try {
    p = new URL(url ?? "/", "http://localhost").searchParams;
  } catch {
    return { year: currentYear(), month: currentMonth(), force: false, tz: tzOffsetSeconds() };
  }
  const force = p.get("force") === "1" || p.get("force") === "true";
  const y = Number.parseInt(p.get("year") ?? "", 10);
  const m = Number.parseInt(p.get("month") ?? "", 10);
  return {
    year: Number.isFinite(y) && y > 0 ? y : currentYear(),
    month: Number.isFinite(m) && m >= 1 && m <= 12 ? m : currentMonth(),
    force,
    tz: tzOffsetSeconds(p.get("tz")),
  };
}

export function officialQuery(url) {
  let p;
  try {
    p = new URL(url ?? "/", "http://localhost").searchParams;
  } catch {
    return { range: "today" };
  }
  const range = p.get("range");
  const allowed = new Set(["today", "yesterday", "last7", "last30", "thisMonth", "lastMonth"]);
  return {
    range: allowed.has(range) ? range : "today",
    force: p.get("force") === "1" || p.get("force") === "true",
    tz: tzOffsetSeconds(p.get("tz")),
  };
}

/**
 * 本地视图的 query：既支持 `range=...`，也支持 `from=YYYY-MM-DD&to=...`
 * （日历跨月加载用）。
 */
export function localQuery(url) {
  let p;
  try {
    p = new URL(url ?? "/", "http://localhost").searchParams;
  } catch {
    return { range: "today", from: null, to: null, scope: "all", rates: null, force: false, tz: tzOffsetSeconds() };
  }
  const rawRange = p.get("range");
  const allowed = new Set(["today", "yesterday", "last7", "last30", "thisMonth", "lastMonth"]);
  const from = isoDate(p.get("from"));
  const to = isoDate(p.get("to"));
  const custom = from !== null && to !== null;
  return {
    range: custom ? "custom" : allowed.has(rawRange) ? rawRange : "today",
    from,
    to,
    scope: p.get("scope") === "deepseek" ? "deepseek" : "all",
    rates: parseRates(p.get("rates")),
    force: p.get("force") === "1" || p.get("force") === "true",
    tz: tzOffsetSeconds(p.get("tz")),
  };
}

/** 客户端费率编辑器的覆盖表；只接受有限大小的合法数字，失败时忽略并用默认表。 */
export function parseRates(raw) {
  if (typeof raw !== "string" || raw.length === 0 || raw.length > 16_000) return null;
  let value;
  try {
    value = JSON.parse(raw);
  } catch {
    return null;
  }
  if (value === null || typeof value !== "object" || Array.isArray(value)) return null;
  const out = {};
  for (const key of Object.keys(value).slice(0, 100)) {
    if (!/^[\w./:+ -]{1,160}$/.test(key) || key === "__proto__" || key === "constructor" || key === "prototype") continue;
    const table = value[key];
    if (table === null || typeof table !== "object" || Array.isArray(table)) continue;
    const clean = (source) => {
      if (source === null || typeof source !== "object" || Array.isArray(source)) return null;
      const price = {};
      for (const field of ["hit", "miss", "cacheWrite", "output"]) {
        const number = source[field];
        if (typeof number !== "number" || !Number.isFinite(number) || number < 0 || number > 1_000_000) return null;
        price[field] = number;
      }
      return price;
    };
    const peak = clean(table.peak);
    const offpeak = clean(table.offpeak);
    if (peak === null || offpeak === null) continue;
    out[key] = { currency: "CNY", peak, offpeak };
  }
  return Object.keys(out).length > 0 ? out : null;
}

function isoDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  return Number.isFinite(Date.parse(`${value}T00:00:00Z`)) ? value : null;
}

/** 把 query 解析成 `{ from, to, granularity }`；自定义范围只按天。 */
export function localWindow(query, now = Date.now()) {
  const { range, from, to, tz } = query;
  if (from !== null && from !== undefined && to !== null && to !== undefined) {
    if (from > to) throw new Error("bad-range");
    return { from, to, granularity: "day" };
  }
  const window = officialRangeWindow(range, now, tz);
  return {
    from: window.from,
    to: window.to,
    granularity: range === "today" || range === "yesterday" ? "hour" : "day",
  };
}

function enforceLocalRange(from, to, lookback) {
  const start = Date.parse(`${from}T00:00:00Z`);
  const end = Date.parse(`${to}T00:00:00Z`);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) throw new Error("bad-range");
  if ((end - start) / 86_400_000 > 800) throw new Error("range-too-long");
  const [year, month] = from.split("-").map(Number);
  enforceLookback(year, month, lookback);
}


/** 日期范围按本地日历日计算（tz 决定「本地」）；近 7/30 天均包含今天。 */
export function officialRangeWindow(range, now = Date.now(), tz = tzOffsetSeconds()) {
  const DAY = 86_400_000;
  const iso = (ms) => new Date(ms).toISOString().slice(0, 10);
  const endOfToday = Math.floor((now + tz * 1000) / DAY) * DAY;
  const local = new Date(endOfToday);
  let from = endOfToday;
  let to = endOfToday;
  if (range === "yesterday") {
    from = endOfToday - DAY;
    to = from;
  } else if (range === "last7") {
    from = endOfToday - 6 * DAY;
  } else if (range === "last30") {
    from = endOfToday - 29 * DAY;
  } else if (range === "thisMonth") {
    from = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), 1);
  } else if (range === "lastMonth") {
    from = Date.UTC(local.getUTCFullYear(), local.getUTCMonth() - 1, 1);
    to = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), 1) - DAY;
  }
  return { from: iso(from), to: iso(to) };
}

export function monthsForRange(range, now = Date.now(), tz = tzOffsetSeconds()) {
  const { from, to } = officialRangeWindow(range, now, tz);
  return monthsBetweenDates(from, to);
}

function monthsBetweenDates(from, to) {
  const start = Date.parse(`${from}T00:00:00Z`);
  const end = Date.parse(`${to}T00:00:00Z`);
  const months = [];
  for (
    let year = new Date(start).getUTCFullYear(), month = new Date(start).getUTCMonth() + 1;
    year < new Date(end).getUTCFullYear() || (year === new Date(end).getUTCFullYear() && month <= new Date(end).getUTCMonth() + 1);
  ) {
    months.push({ year, month });
    if (month === 12) { year++; month = 1; } else month++;
  }
  return months;
}
/* ---------------- 聚合：summary payload ---------------- */

/**
 * 把 normalized 的 amount + cost + user 聚合成前端一次性能消费的全量。
 *
 * @param {object} deps
 * @param {any[]} deps.amountRows  已 normalize 的 usage/amount 行
 * @param {any[]} deps.costRows    已 normalize 的 usage/cost 行
 * @param {object} deps.user        normalizeUser 结果
 * @param {number} deps.year
 * @param {number} deps.month
 * @param {number} deps.now
 * @param {boolean} deps.force
 */
export function buildSummaryPayload(deps) {
  const { amountRows, costRows, user, year, month, now } = deps;

  // 按 date 聚合：每日 tokens 三段 + requests + cost + 逐模型明细（图表用）
  const dayMap = new Map(); // date -> { hit, miss, output, requests, cost, models[] }
  for (const row of amountRows) {
    const d = dayMap.get(row.date) ?? {
      date: row.date,
      hit: 0,
      miss: 0,
      output: 0,
      requests: 0,
      cost: 0,
      models: [],
    };
    d.hit += row.hit;
    d.miss += row.miss;
    d.output += row.output;
    d.requests += row.requests;
    const tokens = row.hit + row.miss + row.output;
    const byModel = d.models.find((m) => m.model === row.model);
    if (byModel) {
      byModel.tokens += tokens;
      byModel.requests += row.requests;
    } else {
      d.models.push({ model: row.model, tokens, requests: row.requests, cost: 0 });
    }
    d.models = d.models.filter((m) => m.tokens > 0 || m.cost > 0);
    dayMap.set(row.date, d);
  }
  for (const c of costRows) {
    const d = dayMap.get(c.date) ?? { date: c.date, hit: 0, miss: 0, output: 0, requests: 0, cost: 0, models: [] };
    d.cost += c.cost;
    const model = d.models.find((m) => m.model === c.model);
    if (model) model.cost += c.cost;
    else d.models.push({ model: c.model, tokens: 0, requests: 0, cost: c.cost });
    dayMap.set(c.date, d);
  }

  const days = Array.from(dayMap.values()).sort(byDateAsc);

  const today = dateString(now);
  const todayUsage = days.find((d) => d.date === today) ?? emptyDay(today);
  const yesterdayUsage = days.find((d) => d.date === dateString(now - 86_400_000)) ?? emptyDay(dateString(now - 86_400_000));
  const deltaPct = ratio(todayUsage, yesterdayUsage);

  // 月汇总
  const monthTotals = days.reduce(
    (acc, d) => {
      acc.hit += d.hit;
      acc.miss += d.miss;
      acc.output += d.output;
      acc.requests += d.requests;
      acc.cost += d.cost;
      return acc;
    },
    { hit: 0, miss: 0, output: 0, requests: 0, cost: 0 }
  );
  const monthTokens = monthTotals.hit + monthTotals.miss + monthTotals.output;
  const monthHitRate = safeDiv(monthTotals.hit, monthTotals.hit + monthTotals.miss);

  // 模型拆分
  const modelMap = new Map();
  for (const row of amountRows) {
    const m =
      modelMap.get(row.model) ?? { model: row.model, hit: 0, miss: 0, output: 0, tokens: 0, requests: 0, cost: 0 };
    m.hit += row.hit;
    m.miss += row.miss;
    m.output += row.output;
    m.tokens += row.hit + row.miss + row.output;
    m.requests += row.requests;
    modelMap.set(row.model, m);
  }
  for (const row of costRows) {
    const m = modelMap.get(row.model) ?? { model: row.model, hit: 0, miss: 0, output: 0, tokens: 0, requests: 0, cost: 0 };
    m.cost += row.cost;
    modelMap.set(row.model, m);
  }
  const models = Array.from(modelMap.values())
    .filter((m) => m.tokens > 0 || m.cost > 0)
    .map((m) => ({ ...m, ratio: safeDiv(m.tokens, monthTokens || 1) }))
    .sort((a, b) => b.tokens - a.tokens);

  return {
    ok: true,
    version: VERSION,
    fetchedAt: now,
    range: { year, month },
    balance: {
      total: user.total,
      granted: user.granted,
      toppedUp: user.toppedUp,
      /** 账号历史累计消费（官方 total_costs）。 */
      consumedTotal: user.consumedTotal ?? 0,
      currency: user.currency ?? "CNY",
    },
    today: { ...todayUsage, deltaPct },
    days,
    month: {
      tokens: monthTokens,
      cost: round2(monthTotals.cost),
      requests: monthTotals.requests,
      hitRate: monthHitRate,
    },
    models,
    user,
  };
}

/* ---------------- 聚合：official 视图 payload ---------------- */

/**
 * 官方视图：1:1 映射官方用量页信息结构。
 * @param {object} deps { summary, range }
 */
export function buildOfficialPayload(deps) {
  const { summary, range } = deps;
  const now = deps.now ?? Date.now();
  const tz = deps.tz ?? tzOffsetSeconds();
  const { from, to } = officialRangeWindow(range, now, tz);
  const sourceDays = new Map((summary.days ?? []).filter((d) => d.date >= from && d.date <= to).map((d) => [d.date, d]));
  const window = [];
  for (let cursor = new Date(`${from}T00:00:00`), last = new Date(`${to}T00:00:00`); cursor <= last; cursor = addDays(cursor, 1)) {
    const date = dateString(cursor.getTime());
    window.push(sourceDays.get(date) ?? emptyDay(date));
  }

  const tokens = window.reduce(
    (a, d) => {
      a.hit += d.hit;
      a.miss += d.miss;
      a.output += d.output;
      a.total += d.hit + d.miss + d.output;
      a.requests += d.requests;
      return a;
    },
    { hit: 0, miss: 0, output: 0, total: 0, requests: 0 }
  );
  const cost = round2(window.reduce((a, d) => a + d.cost, 0));
  const hitRate = safeDiv(tokens.hit, tokens.hit + tokens.miss);
  const modelMap = new Map();
  for (const day of window) {
    for (const row of day.models ?? []) {
      const model = modelMap.get(row.model) ?? { model: row.model, tokens: 0, requests: 0, cost: 0 };
      model.tokens += row.tokens ?? 0;
      model.requests += row.requests ?? 0;
      model.cost += row.cost ?? 0;
      modelMap.set(row.model, model);
    }
  }
  const models = Array.from(modelMap.values()).sort((a, b) => b.tokens - a.tokens);

  return {
    ok: true,
    version: VERSION,
    fetchedAt: now,
    range,
    window: { from, to },
    granularity: "day",
    points: window,
    days: window,
    models,
    balance: summary.balance,
    consumedTotal: round2(summary.balance?.consumedTotal ?? summary.user?.consumedTotal ?? 0),
    spent: cost, // 当前时间窗消费
    requests: tokens.requests,
    tokens: {
      total: tokens.total,
      hit: tokens.hit,
      miss: tokens.miss,
      output: tokens.output,
      hitRate,
      // 三色构成比例（前端用量条）
      ratio: {
        hit: safeDiv(tokens.hit, tokens.total || 1),
        miss: safeDiv(tokens.miss, tokens.total || 1),
        output: safeDiv(tokens.output, tokens.total || 1),
      },
    },
    // 5 分钟延迟说明（官方页面也是这个口径）
    latencyNote: "数据可能有最多 5 分钟延迟",
  };
}

/**
 * 小时粒度 payload：今天/昨天按 1 小时一个点，和官方用量页一致。
 *
 * @param {object} deps { amount, cost, user, range, now, tz, start, end }
 */
export function buildHourlyPayload(deps) {
  const { amount, cost, user, range, now, tz, start, end } = deps;
  const step = amount?.bucket || cost?.bucket || 3_600;
  const buckets = new Map();

  const ensure = (ts) => {
    let bucket = buckets.get(ts);
    if (!bucket) {
      const local = new Date((ts + tz) * 1000);
      const hh = String(local.getUTCHours()).padStart(2, "0");
      bucket = {
        ts,
        date: localDate(ts, tz),
        key: `${localDate(ts, tz)}T${hh}`,
        label: `${hh}:00`,
        hour: local.getUTCHours(),
        hit: 0,
        miss: 0,
        output: 0,
        requests: 0,
        cost: 0,
        models: new Map(),
      };
      buckets.set(ts, bucket);
    }
    return bucket;
  };
  // 先铺满整个窗口，保证 x 轴刻度不因空桶而错位
  for (let ts = start; ts < end; ts += step) ensure(ts);

  const modelOf = (bucket, name) => {
    let model = bucket.models.get(name);
    if (!model) {
      model = { model: name, tokens: 0, requests: 0, cost: 0 };
      bucket.models.set(name, model);
    }
    return model;
  };

  for (const row of Array.isArray(amount?.rows) ? amount.rows : []) {
    if (row.ts < start || row.ts >= end) continue;
    const bucket = ensure(row.ts);
    const model = modelOf(bucket, row.model);
    bucket.hit += row.hit;
    bucket.miss += row.miss;
    bucket.output += row.output;
    bucket.requests += row.requests;
    model.tokens += row.hit + row.miss + row.output;
    model.requests += row.requests;
  }
  for (const row of Array.isArray(cost?.rows) ? cost.rows : []) {
    if (row.ts < start || row.ts >= end) continue;
    const bucket = ensure(row.ts);
    bucket.cost += row.cost;
    modelOf(bucket, row.model).cost += row.cost;
  }

  // 图表只画到「当前小时」，未来小时不占位（总量口径不变，未来桶本来就是 0）
  const cutoff = localHourFloor(now / 1000, tz) + 3_600;
  const points = Array.from(buckets.values())
    .filter((bucket) => bucket.ts < cutoff)
    .sort((a, b) => a.ts - b.ts)
    .map((bucket) => ({
      ...bucket,
      cost: round2(bucket.cost),
      models: Array.from(bucket.models.values()).sort((a, b) => b.tokens - a.tokens),
    }));

  const totals = { hit: 0, miss: 0, output: 0, requests: 0, cost: 0 };
  const modelTotals = new Map();
  for (const point of points) {
    totals.hit += point.hit;
    totals.miss += point.miss;
    totals.output += point.output;
    totals.requests += point.requests;
    totals.cost += point.cost;
    for (const model of point.models) {
      const acc = modelTotals.get(model.model) ?? { model: model.model, tokens: 0, requests: 0, cost: 0 };
      acc.tokens += model.tokens;
      acc.requests += model.requests;
      acc.cost += model.cost;
      modelTotals.set(model.model, acc);
    }
  }

  const totalTokens = totals.hit + totals.miss + totals.output;
  const models = Array.from(modelTotals.values())
    .filter((m) => m.tokens > 0 || m.cost > 0)
    .sort((a, b) => b.tokens - a.tokens);
  const day = {
    date: range === "today" ? localDate(now / 1000, tz) : localDate(start, tz),
    hit: totals.hit,
    miss: totals.miss,
    output: totals.output,
    requests: totals.requests,
    cost: round2(totals.cost),
    models: models.filter((m) => m.tokens > 0 || m.cost > 0),
    points,
  };

  return {
    ok: true,
    version: VERSION,
    fetchedAt: now,
    range,
    window: { from: day.date, to: day.date },
    granularity: "hour",
    points,
    days: [day],
    models,
    balance: {
      total: user.total,
      granted: user.granted,
      toppedUp: user.toppedUp,
      consumedTotal: user.consumedTotal ?? 0,
      currency: user.currency ?? "CNY",
    },
    consumedTotal: round2(user.consumedTotal ?? 0),
    spent: round2(totals.cost),
    requests: totals.requests,
    tokens: {
      total: totalTokens,
      hit: totals.hit,
      miss: totals.miss,
      output: totals.output,
      hitRate: safeDiv(totals.hit, totals.hit + totals.miss),
      ratio: {
        hit: safeDiv(totals.hit, totalTokens || 1),
        miss: safeDiv(totals.miss, totalTokens || 1),
        output: safeDiv(totals.output, totalTokens || 1),
      },
    },
    latencyNote: "数据可能有最多 5 分钟延迟",
  };
}

function addDays(date, amount) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + amount);
}

/* ---------------- 工具 ---------------- */

function currentYear() {
  return new Date().getFullYear();
}
function currentMonth() {
  return new Date().getMonth() + 1;
}

function dateString(ts) {
  const d = new Date(ts);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * 时区偏移（秒）。官方接口用 `tz` 决定日/小时桶的边界；缺省取服务端本地时区。
 * 只接受 15 分钟整数倍、[-12h, +14h] 的值，和上游校验一致。
 */
export function tzOffsetSeconds(value) {
  const n = Number.parseInt(String(value ?? ""), 10);
  if (Number.isFinite(n) && n >= -43_200 && n <= 50_400 && n % 900 === 0) return n;
  return -new Date().getTimezoneOffset() * 60;
}

/** 本地日边界（epoch 秒）。 */
export function localDayStart(tsSec, tz) {
  return Math.floor((tsSec + tz) / 86_400) * 86_400 - tz;
}

/** 本地整点边界（epoch 秒）。 */
export function localHourFloor(tsSec, tz) {
  return Math.floor((tsSec + tz) / 3_600) * 3_600 - tz;
}

/** 把 bucket 起点变成该时区的 YYYY-MM-DD。 */
export function localDate(tsSec, tz) {
  return new Date((tsSec + tz) * 1000).toISOString().slice(0, 10);
}

/** 某年某月 1 日 00:00（该时区）的 epoch 秒。 */
function monthStartSec(year, month, tz) {
  return Date.UTC(year, month - 1, 1) / 1000 - tz;
}

function byDateAsc(a, b) {
  return a.date < b.date ? -1 : a.date > b.date ? 1 : 0;
}

function emptyDay(date) {
  return { date, hit: 0, miss: 0, output: 0, requests: 0, cost: 0 };
}

function ratio(today, yesterday) {
  const t = today.hit + today.miss + today.output;
  const y = yesterday.hit + yesterday.miss + yesterday.output;
  if (y === 0) return t > 0 ? 1 : 0;
  return round4((t - y) / y);
}

function safeDiv(a, b) {
  if (!b) return 0;
  return round4(a / b);
}

function round2(n) {
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100) / 100;
}
function round4(n) {
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 10000) / 10000;
}

/* ---------------- 路由注册 ---------------- */

/**
 * 服务名候选：新版叫 webServer，旧版叫 httpServer。两个都要支持。
 */
const WEB_SERVER_NAMES = ["webServer", "httpServer"];

/**
 * 注册回环端点。需要把 auth/api/cache 传进来。
 * @param {object} deps { auth, api, cache, credentials, logger, routeWaitMs }
 */
export function registerRoutes(ctx, deps) {
  const attach = (scoped, server) => {
    if (!server || typeof server.register !== "function") return false;
    attachRoutes(scoped, server, deps);
    deps.logger?.info?.("deepseek-usage: serving endpoints via web server");
    return true;
  };

  // 已有 webServer 则立即注册
  for (const name of WEB_SERVER_NAMES) {
    const immediate = typeof ctx.get === "function" ? ctx.get(name) : undefined;
    if (immediate && attach(ctx, immediate)) return true;
  }

  // 否则等
  deps.logger?.info?.("deepseek-usage: waiting for %s to serve %s", WEB_SERVER_NAMES.join(" or "), BASE_PATH);
  let attached = false;
  const nag = setTimeout(() => {
    if (attached) return;
    deps.logger?.warn?.("deepseek-usage: still no web server after 10s");
  }, deps.routeWaitMs ?? 10_000);
  nag.unref?.();

  for (const name of WEB_SERVER_NAMES) {
    if (typeof ctx.inject !== "function") break;
    ctx.inject([name], (scoped) => {
      const srv = scoped?.[name];
      if (attached || !srv || typeof srv.register !== "function") return;
      attached = true;
      clearTimeout(nag);
      attachRoutes(scoped, srv, deps);
    });
  }
  return true;
}

function attachRoutes(ctx, httpServer, deps) {
  const { account, api, cache, logger, local } = deps;

  const send = (res, status, value) => {
    const body = JSON.stringify(value);
    res.writeHead(status, {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-cache",
    });
    res.end(body);
  };

  const route = (path, handler) => {
    ctx.effect(
      () =>
        httpServer.register({
          kind: "exact",
          path,
          handler: async (req, res) => {
            const refused = screenRequest(req);
            if (refused !== undefined) return send(res, refused.status, refused.body);
            try {
              const out = await handler(req, res);
              if (out !== undefined) send(res, 200, out);
            } catch (error) {
              const status = errorStatus(error);
              logger?.warn?.("deepseek-usage: %s failed: %s", path, error?.message ?? error);
              send(res, status, { ok: false, error: error?.code ?? "internal" });
            }
          },
        }),
      `deepseek-usage ${path} route`
    );
  };

  /**
   * 取平台会话 token；没有就是未登录（不提供登录入口，去 DSH 里登录账号即可）。
   */
  const requireToken = async (force = false) => {
    const token = await account.getToken(force);
    if (!token) throw Object.assign(new Error("unauthenticated"), { code: "unauthenticated" });
    return token;
  };

  /** 上游 401 统一翻译成未登录，并清掉 token 缓存。 */
  const withAuth = async (fn) => {
    try {
      return await fn();
    } catch (error) {
      if (error instanceof UpstreamAuthError) {
        account.invalidate();
        throw Object.assign(new Error("unauthenticated"), { code: "unauthenticated" });
      }
      throw error;
    }
  };

  /**
   * 拉当月全量并聚合。
   *
   * 用「按时间窗」接口而不是老的 usage/amount|cost（月度、UTC 日桶）：
   * 月度接口按 UTC 日切分，东八区每天 00:00–08:00 会被算到前一天，
   * 和官方用量页对不上。这里按本地日桶取到「今天 0 点」，再把今天切小时补上。
   */
  const loadSummary = async ({ year, month, force, tz }) => {
    const nowSec = Math.floor(Date.now() / 1000);
    const start = monthStartSec(year, month, tz);
    const next = monthStartSec(year, month + 1, tz);
    const todayStart = localDayStart(nowSec, tz);
    const dailyEnd = Math.min(next, todayStart);
    const hourlyStart = Math.max(todayStart, start);
    // 今天的小时尾巴也要包含当前这一小时（上游按整点切桶）。
    const hourlyEnd = Math.min(localHourFloor(nowSec, tz) + 3_600, next);
    const hasDaily = dailyEnd > start;
    const hasHourly = hourlyEnd > hourlyStart;
    const key = `summary:${year}-${month}:${tz}:${hasHourly ? hourlyEnd : 0}`;
    return cache.getOrFetch(
      key,
      () =>
        withAuth(async () => {
          const token = await requireToken();
          const jobs = [api.fetchSummary(token)];
          if (hasDaily) {
            jobs.push(api.fetchRangeAmount(token, { start, end: dailyEnd, tz }));
            jobs.push(api.fetchRangeCost(token, { start, end: dailyEnd, tz }));
          }
          if (hasHourly) {
            jobs.push(api.fetchRangeAmount(token, { start: hourlyStart, end: hourlyEnd, tz }));
            jobs.push(api.fetchRangeCost(token, { start: hourlyStart, end: hourlyEnd, tz }));
          }
          const [user, ...rest] = await Promise.all(jobs);
          const amountRows = [];
          const costRows = [];
          for (let i = 0; i < rest.length; i += 2) {
            for (const row of rest[i].rows) {
              amountRows.push({
                date: localDate(row.ts, tz),
                model: row.model,
                hit: row.hit,
                miss: row.miss,
                output: row.output,
                requests: row.requests,
              });
            }
            for (const row of rest[i + 1].rows) {
              costRows.push({ date: localDate(row.ts, tz), model: row.model, cost: row.cost });
            }
          }
          return buildSummaryPayload({ amountRows, costRows, user, year, month, now: Date.now() });
        }),
      { force, ttlMs: 120_000 }
    );
  };

  /** 今天/昨天：1 小时一个桶，和官方用量页的当日图表一致。 */
  const loadHourly = async ({ range, force, tz, now }) => {
    const nowSec = Math.floor(now / 1000);
    const todayStart = localDayStart(nowSec, tz);
    const start = range === "today" ? todayStart : todayStart - 86_400;
    // 和官方用量页一致：整天窗口（次日 0 点结束），未来小时由上游返回空桶。
    // 这样「今天」的总量始终等于官方页面，含当前这一小时已产生的用量。
    const end = start + 86_400;
    const key = `hourly:${tz}:${start}:${end}`;
    return cache.getOrFetch(
      key,
      () =>
        withAuth(async () => {
          const token = await requireToken();
          const [user, amount, cost] = await Promise.all([
            api.fetchSummary(token),
            end > start ? api.fetchRangeAmount(token, { start, end, tz }) : { bucket: 3600, rows: [] },
            end > start ? api.fetchRangeCost(token, { start, end, tz }) : { bucket: 3600, rows: [] },
          ]);
          return buildHourlyPayload({ amount, cost, user, range, now, tz, start, end });
        }),
      { force, ttlMs: 60_000 }
    );
  };

  /** 官方视图的完整加载：/official 与 /reconcile 共用。 */
  const loadOfficial = async ({ range, force, tz, now }) => {
    if (range === "today" || range === "yesterday") {
      return loadHourly({ range, force, tz, now });
    }
    const months = monthsForRange(range, now, tz);
    for (const { year, month } of months) enforceLookback(year, month, deps.lookbackMonths);
    const summaries = await Promise.all(
      months.map(({ year, month }) => loadSummary({ year, month, force, tz }))
    );
    const latest = summaries[summaries.length - 1] ?? {};
    const summary = { ...latest, days: summaries.flatMap((item) => item.days ?? []) };
    return buildOfficialPayload({ summary, range, now, tz });
  };

  /** 自定义日期范围的官方日数据（/reconcile 用；/official 本身只接预设范围）。 */
  const loadOfficialCustom = async ({ from, to, force, tz, now }) => {
    const months = monthsBetweenDates(from, to);
    for (const { year, month } of months) enforceLookback(year, month, deps.lookbackMonths);
    const summaries = await Promise.all(
      months.map(({ year, month }) => loadSummary({ year, month, force, tz }))
    );
    const days = summaries
      .flatMap((item) => item.days ?? [])
      .filter((day) => day.date >= from && day.date <= to)
      .sort(byDateAsc);
    const points = days.map((day) => {
      const tokens = (day.hit ?? 0) + (day.miss ?? 0) + (day.output ?? 0);
      return {
        date: day.date,
        hit: day.hit ?? 0,
        miss: day.miss ?? 0,
        output: day.output ?? 0,
        requests: day.requests ?? 0,
        cost: day.cost ?? 0,
        tokens,
        models: day.models ?? [],
      };
    });
    const totals = points.reduce(
      (acc, point) => {
        acc.hit += point.hit;
        acc.miss += point.miss;
        acc.output += point.output;
        acc.tokens += point.tokens;
        acc.requests += point.requests;
        acc.cost += point.cost;
        return acc;
      },
      { hit: 0, miss: 0, output: 0, tokens: 0, requests: 0, cost: 0 }
    );
    return {
      ok: true,
      range: "custom",
      granularity: "day",
      points,
      days: points,
      window: { from, to },
      tokens: { total: totals.tokens, hit: totals.hit, miss: totals.miss, output: totals.output },
      requests: totals.requests,
      spent: totals.cost,
      fetchedAt: now,
    };
  };

  // 面板样式表随路由下发：样式有 ~50KB，塞进客户端 bundle 会撑爆 60KB 上限。
  let cssCache;
  let cssMtime = 0;
  ctx.effect(
    () =>
      httpServer.register({
        kind: "exact",
        path: PANEL_CSS_PATH,
        handler: async (req, res) => {
          const refused = screenRequest(req);
          if (refused !== undefined) return send(res, refused.status, refused.body);
          if (req.method !== "GET") return send(res, 405, { ok: false, error: "method-not-allowed" });
          try {
            const cssPath = new URL("./panel.css", import.meta.url);
            const cssStat = statSync(cssPath);
            if (cssCache === undefined || cssStat.mtimeMs !== cssMtime) {
              cssCache = readFileSync(cssPath, "utf8");
              cssMtime = cssStat.mtimeMs;
            }
            res.writeHead(200, {
              "content-type": "text/css; charset=utf-8",
              "cache-control": "no-cache",
            });
            res.end(cssCache);
          } catch (error) {
            logger?.warn?.("deepseek-usage: panel.css failed: %s", error?.message ?? error);
            send(res, 500, { ok: false, error: "css-unavailable" });
          }
        },
      }),
    "deepseek-usage panel.css route"
  );

  route(STATUS_PATH, async () => ({
    ok: true,
    ...(await account.status()),
    local: local ? local.status(tzOffsetSeconds()) : { available: false },
  }));

  route(SUMMARY_PATH, async (req) => {
    const { year, month, force, tz } = summaryQuery(req.url);
    enforceLookback(year, month, deps.lookbackMonths);
    return loadSummary({ year, month, force, tz });
  });

  route(OFFICIAL_PATH, async (req) => {
    const { range, force, tz } = officialQuery(req.url);
    return loadOfficial({ range, force, tz, now: Date.now() });
  });

  route(LOCAL_PATH, async (req) => {
    if (!local) {
      throw Object.assign(new Error("local-unavailable"), { code: "local-unavailable" });
    }
    const query = localQuery(req.url);
    const now = Date.now();
    const window = localWindow(query, now);
    enforceLocalRange(window.from, window.to, deps.lookbackMonths);
    const payload = await local.query({
      ...window,
      tz: query.tz,
      scope: query.scope,
      rates: query.rates,
      now,
      force: query.force,
      range: query.range,
    });
    return { ...payload, version: VERSION };
  });

  route(RECONCILE_PATH, async (req) => {
    const query = localQuery(req.url);
    // 对账默认只比 DeepSeek 官方路由；/local 自己默认 all。显式 scope=all 才放开。
    const reconcileScope = new URL(req.url ?? "/", "http://localhost").searchParams.get("scope") === "all" ? "all" : "deepseek";
    const now = Date.now();
    const window = localWindow(query, now);
    enforceLocalRange(window.from, window.to, deps.lookbackMonths);

    let localPayload = null;
    let localError = null;
    if (local) {
      try {
        localPayload = await local.query({
          ...window,
          tz: query.tz,
          scope: reconcileScope,
          rates: query.rates,
          now,
          force: query.force,
          range: query.range,
        });
      } catch (error) {
        localError = error?.code ?? "local-failed";
      }
    } else {
      localError = "local-unavailable";
    }

    let officialPayload = null;
    let officialError = null;
    try {
      // 对账必须两张表都尽量出；官方未登录/失败时降级为只显示本地。
      officialPayload =
        query.range === "custom"
          ? await loadOfficialCustom({ from: window.from, to: window.to, force: query.force, tz: query.tz, now })
          : await loadOfficial({ range: query.range, force: query.force, tz: query.tz, now });
    } catch (error) {
      officialError =
        error?.code === "unauthenticated" ? "unauthenticated" : error?.code ?? error?.message ?? "official-failed";
    }

    if (localPayload === null && officialPayload === null) {
      throw Object.assign(new Error("reconcile-unavailable"), { code: "reconcile-unavailable" });
    }

    return {
      ...buildReconcilePayload({
        official: officialPayload,
        local: localPayload,
        officialError,
        localError,
        range: query.range,
        now,
      }),
      version: VERSION,
    };
  });
}

function enforceLookback(year, month, lookback) {
  const L = lookback ?? 6;
  const now = new Date();
  const cur = now.getFullYear() * 12 + (now.getMonth() + 1);
  const target = year * 12 + month;
  if (target > cur) throw new Error("future-month-forbidden");
  if (cur - target > L) throw new Error("lookback-exceeded");
}

function errorStatus(error) {
  if (error?.code === "unauthenticated") return 401;
  if (error?.code === "forbidden") return 403;
  if (error?.code === "local-unavailable" || error?.code === "reconcile-unavailable") return 503;
  if (
    error?.message === "future-month-forbidden" ||
    error?.message === "lookback-exceeded" ||
    error?.message === "bad-range" ||
    error?.message === "range-too-long"
  ) {
    return 400;
  }
  return 500;
}
