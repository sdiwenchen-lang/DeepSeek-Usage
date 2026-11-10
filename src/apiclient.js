/**
 * DeepSeek 官方平台 API 客户端（服务端半边）。
 *
 * ★ 这是整个仓库里**唯一**允许出现 `platform.deepseek.com` 的文件。
 *
 * ## 鉴权口径（0.2.1 实测）
 *
 * 宿主在 DSH 里登录 DeepSeek 账号后，会把会话 grant 存进自己的凭据库：
 *
 *   records["deepseek-account-platform/default"] = { kind: "grant", payload: { token } }
 *
 * 这个 grant 就是官方平台会话，直接带 `x-dsh-auth-token` 头即可查询，**无需登录**：
 *
 *   - 余额/累计消费  GET /api/v0/users/get_user_summary
 *   - 用量明细       GET /api/v0/usage/amount?month=&year=
 *   - 费用明细       GET /api/v0/usage/cost?month=&year=
 *
 * 注意 `/api/v0/users/current` 在平台侧已 404，必须用 `get_user_summary`。
 *
 * ## 上游响应形状（实测）
 *
 *   get_user_summary → { data: { biz_data: {
 *       normal_wallets: [{ currency, balance }],
 *       bonus_wallets:  [{ currency, balance }],
 *       total_costs:    [{ currency, amount }] } } }
 *
 *   usage/amount → { data: { biz_data: {
 *       total: [{ model, usage: [{ type, amount }] }],
 *       days:  [{ date, data: [{ model, usage: [{ type, amount }] }] }] } } }
 *
 *   usage/cost → { data: { biz_data: [{ total, days, currency }] } }
 *
 * usage 的 type 取值：PROMPT_TOKEN / PROMPT_CACHE_HIT_TOKEN /
 * PROMPT_CACHE_MISS_TOKEN / RESPONSE_TOKEN / REQUEST。金额字段是字符串。
 *
 * @module deepseek-usage/apiclient
 */

/** 上游主机。 */
export const UPSTREAM_BASE = "https://platform.deepseek.com";

/** 端点。 */
export const ENDPOINTS = {
  SUMMARY: "/api/v0/users/get_user_summary",
  USAGE_AMOUNT: "/api/v0/usage/amount",
  USAGE_COST: "/api/v0/usage/cost",
  /** 按时间窗取数（官方用量页实际使用的接口）：金额/用量都按 bucket 返回。 */
  RANGE_AMOUNT: "/api/v0/usage/by_api_key/amount",
  RANGE_COST: "/api/v0/usage/by_api_key/cost",
};

/** 浏览器 UA：上游对裸 curl 直接 429，必须带。 */
const BROWSER_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36";

/** 平台会话头。 */
export const TOKEN_HEADER = "x-dsh-auth-token";

/**
 * 造一个上游客户端。
 *
 * @param {object} opts
 * @param {string} [opts.xAppVersion]      — 注入 x-app-version 头
 * @param {number} [opts.timeoutMs=10000]  — 整次请求总时限（含重试、等待和正文解析）
 * @param {number[]} [opts.backoffMs]      — 429/5xx 指数退避序列
 * @param {typeof fetch} [opts.fetch]      — 可注入的 fetch（测试用）
 * @param {(s: string) => void} [opts.log] — 日志
 */
export function createApiClient(opts = {}) {
  const xAppVersion = opts.xAppVersion ?? "0.1.0";
  const timeoutMs = opts.timeoutMs ?? 10000;
  const backoffMs = Array.isArray(opts.backoffMs) ? opts.backoffMs : [1000, 2000, 4000];
  const doFetch = opts.fetch ?? globalThis.fetch;
  const log = opts.log ?? (() => {});

  if (typeof doFetch !== "function") {
    throw new Error("apiclient: global fetch is unavailable and no fetch was injected");
  }

  const pending = new Set();
  let disposed = false;

  /** Abort current work and reject later requests without contacting upstream. */
  function dispose() {
    disposed = true;
    for (const controller of pending) controller.abort(new DOMException("API client disposed", "AbortError"));
  }

  /** One deadline covers retries, backoff, and consuming the response body. */
  async function request(path, token) {
    if (disposed) throw new DOMException("API client disposed", "AbortError");
    const controller = new AbortController();
    const { signal } = controller;
    pending.add(controller);
    const timer = setTimeout(() => controller.abort(new DOMException("Upstream request timed out", "TimeoutError")), timeoutMs);
    const headers = {
      "User-Agent": BROWSER_UA,
      "x-app-version": xAppVersion,
      "accept": "application/json, text/plain, */*",
      "origin": UPSTREAM_BASE,
      "referer": UPSTREAM_BASE + "/",
      [TOKEN_HEADER]: token,
    };

    let res;
    try {
      for (let attempt = 0; ; attempt++) {
        res = await withAbort(signal, () => doFetch(UPSTREAM_BASE + path, { headers, signal }));
        if ((res.status === 429 || res.status >= 500) && attempt < backoffMs.length) {
          log(`retry ${res.status} on ${path} (attempt ${attempt + 1})`);
          await withAbort(signal, () => releaseResponse(res));
          res = undefined;
          await sleep(backoffMs[attempt], signal);
          continue;
        }
        if (res.status === 401) throw new UpstreamAuthError("upstream returned 401");
        if (!res.ok) {
          const body = await withAbort(signal, () => safeText(res));
          throw new UpstreamError(`upstream ${res.status} on ${path}`, res.status, body);
        }
        return await withAbort(signal, () => payload(res, path));
      }
    } finally {
      clearTimeout(timer);
      pending.delete(controller);
      // Do not wait for a stalled stream to acknowledge cancellation.
      void releaseResponse(res);
    }
  }

  /**
   * 解包 `{ code, msg, data: { biz_data } }`。
   * 平台用 `code !== 0` / `biz_code !== 0` 表达业务错误；40003 是会话失效。
   */
  async function payload(res, path) {
    const json = await res.json();
    if (json && typeof json === "object" && json.code !== undefined && json.code !== 0) {
      throw new UpstreamError(`upstream code ${json.code} on ${path}`, 200, JSON.stringify(json));
    }
    const data = json?.data;
    const biz = data && typeof data === "object" ? data.biz_data : undefined;
    if (biz !== undefined && biz !== null) {
      if (typeof biz === "object" && biz.biz_code !== undefined && biz.biz_code !== 0) {
        throw new UpstreamError(`upstream biz_code ${biz.biz_code} on ${path}`, 200, JSON.stringify(json));
      }
      // biz_data 可能是业务数据本身，也可能被再包一层
      if (typeof biz === "object" && !Array.isArray(biz) && biz.biz_data !== undefined) return biz.biz_data;
      return biz;
    }
    return data ?? json;
  }

  /** 余额 + 累计消费。 */
  async function fetchSummary(token) {
    return normalizeUser(await request(ENDPOINTS.SUMMARY, token));
  }

  /** 用量明细：按日期 × 模型返回 token 三段 + 请求数。 */
  async function fetchUsageAmount(token, { year, month }) {
    const qs = `?month=${month}&year=${year}`;
    return normalizeUsageRows(await request(ENDPOINTS.USAGE_AMOUNT + qs, token));
  }

  /** 费用明细：按日期 × 模型返回费用。 */
  async function fetchUsageCost(token, { year, month }) {
    const qs = `?month=${month}&year=${year}`;
    return normalizeCostRows(await request(ENDPOINTS.USAGE_COST + qs, token));
  }

  /**
   * 任意时间窗的用量（bucket 由上游按窗口长度决定：≤24h 为 1h，否则 1d）。
   * `start`/`end` 是 epoch 秒，且必须按 bucket 对齐；`tz` 是时区偏移秒数。
   */
  async function fetchRangeAmount(token, { start, end, tz }) {
    const qs = `?start=${start}&end=${end}&tz=${tz}`;
    return normalizeRangeAmount(await request(ENDPOINTS.RANGE_AMOUNT + qs, token));
  }

  /** 任意时间窗的费用，形状与 fetchRangeAmount 对齐。 */
  async function fetchRangeCost(token, { start, end, tz }) {
    const qs = `?start=${start}&end=${end}&tz=${tz}`;
    return normalizeRangeCost(await request(ENDPOINTS.RANGE_COST + qs, token));
  }

  return { fetchSummary, fetchUsageAmount, fetchUsageCost, fetchRangeAmount, fetchRangeCost, dispose };
}

/* ---------------- 响应规范化（纯函数，便于单测） ---------------- */

/**
 * 把 get_user_summary 规范化为余额对象。
 *
 * 官方口径：
 *   - normal_wallets  → 充值余额（现金）
 *   - bonus_wallets   → 赠送余额
 *   - total_costs     → 累计消费
 *
 * @returns {{total: number, granted: number, toppedUp: number, consumedTotal: number, currency: string}}
 */
export function normalizeUser(data) {
  const empty = { total: 0, granted: 0, toppedUp: 0, consumedTotal: 0, currency: "CNY" };
  if (!data || typeof data !== "object") return empty;

  const wallet = (rows) => {
    const row = Array.isArray(rows) ? rows[0] : undefined;
    return row ? Number(row.balance) || 0 : 0;
  };
  const normal = wallet(data.normal_wallets);
  const bonus = wallet(data.bonus_wallets);
  const costRow = Array.isArray(data.total_costs) ? data.total_costs[0] : undefined;
  const currency =
    data.normal_wallets?.[0]?.currency ?? data.bonus_wallets?.[0]?.currency ?? costRow?.currency ?? "CNY";

  return {
    total: round2(normal + bonus),
    granted: round2(bonus),
    toppedUp: round2(normal),
    consumedTotal: round2(costRow ? Number(costRow.amount) || 0 : 0),
    currency: String(currency),
  };
}

/**
 * 把 usage/amount 规范化为 DailyAmount 行：
 *   { date, model, hit, miss, output, requests }
 *
 * 兼容两种输入：
 *   - 官方形状 `{ total: [...], days: [{ date, data: [{ model, usage }] }] }`
 *   - 扁平数组（旧测试夹具）
 */
export function normalizeUsageRows(data) {
  const rows = flattenUsage(data);
  return rows
    .map((row) => ({
      date: String(row.date ?? ""),
      model: String(row.model ?? "unknown"),
      hit: num(row.usageOf.PROMPT_CACHE_HIT_TOKEN),
      miss: num(row.usageOf.PROMPT_CACHE_MISS_TOKEN),
      output: num(row.usageOf.RESPONSE_TOKEN),
      requests: num(row.usageOf.REQUEST),
    }))
    .filter((r) => r.date);
}

/**
 * 把 usage/cost 规范化为 `{ date, model, cost }` 行。
 * 官方形状是 `[{ total, days, currency }]`；金额是字符串。
 */
export function normalizeCostRows(data) {
  const rows = flattenUsage(data);
  return rows
    .map((row) => {
      // 费用接口里 usage 的 amount 直接就是金额
      let sum = 0;
      for (const value of Object.values(row.usageOf)) sum += num(value);
      return { date: String(row.date ?? ""), model: String(row.model ?? "unknown"), cost: round2(sum) };
    })
    .filter((r) => r.date);
}

/**
 * 把官方 usage 形状摊平成 `{ date, model, usageOf }`。
 * @param {any} data
 * @returns {Array<{date: string, model: string, usageOf: Record<string, number|string>}>}
 */
function flattenUsage(data) {
  const out = [];

  const takePair = (date, model, usage) => {
    const usageOf = {};
    for (const item of Array.isArray(usage) ? usage : []) {
      if (item && typeof item === "object") usageOf[String(item.type)] = item.amount;
    }
    out.push({ date: String(date ?? ""), model: String(model ?? "unknown"), usageOf });
  };

  // 官方形状：数组，元素含 days（可能被外层包成 [{...}]）
  const blocks = Array.isArray(data) ? data : data && typeof data === "object" ? [data] : [];
  for (const block of blocks) {
    if (!block || typeof block !== "object") continue;
    if (Array.isArray(block.days)) {
      for (const day of block.days) {
        const date = day?.date;
        for (const item of Array.isArray(day?.data) ? day.data : []) {
          takePair(date, item?.model, item?.usage);
        }
      }
    }
    // 只有 total 没有 days：摊成一行（date 为空，调用方按日聚合时会忽略）
    if (!block.days && Array.isArray(block.total) && block.total.length > 0) continue;
  }
  return out;
}

/**
 * 把 by_api_key/amount 的 biz_data 摊平为 bucket 行：
 *   { ts, model, hit, miss, output, requests }
 *
 * @returns {{bucket: number, rows: Array<object>}}
 */
export function normalizeRangeAmount(data) {
  const bucket = rangeBucket(data);
  const rows = [];
  for (const series of rangeArray(data.series)) {
    const model = rangeModel(series);
    for (const item of rangeArray(series.buckets)) {
      if (!record(item) || !record(item.usage)) invalidRange();
      const usage = item.usage;
      if (usage.PROMPT_TOKEN !== undefined) rangeNumber(usage.PROMPT_TOKEN);
      rows.push({
        ts: rangeTime(item.time), model,
        hit: rangeNumber(usage.PROMPT_CACHE_HIT_TOKEN),
        miss: rangeNumber(usage.PROMPT_CACHE_MISS_TOKEN),
        output: rangeNumber(usage.RESPONSE_TOKEN),
        requests: rangeNumber(usage.REQUEST),
      });
    }
  }
  return { bucket, rows };
}

/**
 * 把 by_api_key/cost 的 biz_data 摊平为 bucket 行：
 *   { ts, model, cost }
 * 多币种时只取 CNY（面板按人民币展示）。
 */
export function normalizeRangeCost(data) {
  const bucket = rangeBucket(data);
  const rows = [];
  for (const currency of rangeArray(data.data)) {
    if (!record(currency) || typeof currency.currency !== "string" || !/^[A-Z]{3}$/.test(currency.currency)) invalidRange();
    for (const series of rangeArray(currency.series)) {
      const model = rangeModel(series);
      for (const item of rangeArray(series.buckets)) {
        if (!record(item)) invalidRange();
        const row = { ts: rangeTime(item.time), model, cost: rangeNumber(item.cost) };
        if (currency.currency === "CNY") rows.push(row);
      }
    }
  }
  return { bucket, rows };
}

function invalidRange() {
  throw Object.assign(new UpstreamError("Invalid upstream range response", 502), { code: "invalid-upstream-response" });
}
function record(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
function rangeArray(value) {
  if (!Array.isArray(value)) invalidRange();
  return value;
}
function rangeNumber(value) {
  if ((typeof value !== "number" && typeof value !== "string") ||
      typeof value === "string" && !value.trim()) invalidRange();
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) invalidRange();
  return number;
}
function rangeBucket(data) {
  if (!record(data)) invalidRange();
  const bucket = rangeNumber(data.bucket);
  if (bucket !== 3600 && bucket !== 86400) invalidRange();
  return bucket;
}
function rangeModel(series) {
  if (!record(series) || typeof series.model !== "string" || !series.model.trim()) invalidRange();
  return series.model;
}
function rangeTime(value) {
  const time = rangeNumber(value);
  // Epoch seconds through year 9999; millisecond timestamps are not seconds.
  if (!Number.isSafeInteger(time) || time > 253402300799) invalidRange();
  return time;
}

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

/* ---------------- 错误类型 ---------------- */

export class UpstreamError extends Error {
  constructor(message, status, raw) {
    super(message);
    this.name = "UpstreamError";
    this.status = status;
    this.raw = raw;
  }
}

export class UpstreamAuthError extends UpstreamError {
  constructor(message) {
    super(message, 401);
    this.name = "UpstreamAuthError";
  }
}

/* ---------------- 工具 ---------------- */

function withAbort(signal, operation) {
  return new Promise((resolve, reject) => {
    if (signal.aborted) return reject(signal.reason);
    const abort = () => reject(signal.reason);
    signal.addEventListener("abort", abort, { once: true });
    Promise.resolve().then(() => {
      if (signal.aborted) throw signal.reason;
      return operation();
    }).then(resolve, reject).finally(() => signal.removeEventListener("abort", abort));
  });
}

async function sleep(ms, signal) {
  let timer;
  try {
    await withAbort(signal, () => new Promise((resolve) => { timer = setTimeout(resolve, ms); }));
  } finally {
    clearTimeout(timer);
  }
}

async function releaseResponse(res) {
  try { await res?.body?.cancel?.(); } catch { /* A consumed body is already released. */ }
}

function safeText(res) {
  return res.text().catch(() => "");
}

function round2(n) {
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100) / 100;
}

/** 账号脱敏：s***n@qq.com / 138****1234 */
export function maskAccount(account) {
  const s = String(account ?? "");
  if (!s) return "";
  if (s.includes("@")) {
    const [name, domain] = s.split("@");
    if (name.length <= 2) return `${name[0]}***@${domain}`;
    return `${name[0]}***${name[name.length - 1]}@${domain}`;
  }
  if (/^\d{11}$/.test(s)) return s.slice(0, 3) + "****" + s.slice(-4);
  return s.slice(0, 2) + "***";
}
