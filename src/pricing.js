/**
 * DeepSeek 本地费用估算。
 *
 * 本地日志只有 provider 上报的 usage，没有账单金额；这里用「官方价 × 四桶 token」
 * 反推一个**估算值**。官方账单仍是权威口径，估算只用于本地视图和对账时解释差额。
 *
 * ## 价格来源
 *
 * 默认表与 CC Switch 的 DeepSeek 行同步（USD/百万 token），按 7.0 折算成
 * CNY/百万 token；峰谷按本项目约定（可用 config.peakIntervals / holidays 覆盖）：
 *
 *   - 工作日 08:00–12:00、14:00–18:00（Asia/Shanghai）为高峰；
 *   - 其余时间、周末、法定节假日为低谷；
 *   - 命中 / 未命中 / 写入 / 输出四个桶分别计价，不合并。
 *
 * 用户可通过 `config.pricing.models` 覆盖任意模型的价格；未知模型返回 `null`，
 * 绝不按 0 元计费。
 *
 * @module deepseek-usage/pricing
 */

const BEIJING_OFFSET_SECONDS = 8 * 3600;
const DEFAULT_PEAK_INTERVALS = [
  [8 * 60, 12 * 60],
  [14 * 60, 18 * 60],
];

/**
 * 中国法定节假日（含调休放假日；周末已经按低谷处理）。
 * 以区间表示，避免逐日列出；调休上班日没有列入，仍按周末低谷估算。
 */
const DEFAULT_HOLIDAY_RANGES = Object.freeze([
  ["2025-01-01", "2025-01-01"],
  ["2025-01-28", "2025-02-04"],
  ["2025-04-04", "2025-04-06"],
  ["2025-05-01", "2025-05-05"],
  ["2025-05-31", "2025-06-02"],
  ["2025-10-01", "2025-10-08"],
  ["2026-01-01", "2026-01-03"],
  ["2026-02-15", "2026-02-22"],
  ["2026-04-04", "2026-04-06"],
  ["2026-05-01", "2026-05-05"],
  ["2026-06-19", "2026-06-21"],
  ["2026-09-25", "2026-09-27"],
  ["2026-10-01", "2026-10-07"],
]);

const CNY = "CNY";

function costTable(miss, hit, cacheWrite, output) {
  return Object.freeze({ miss, hit, cacheWrite, output });
}

/** 官方 V4.1 Flash：高峰 / 低谷两档。 */
const FLASH = Object.freeze({
  currency: CNY,
  peak: costTable(2, 0.04, 0, 8),
  offpeak: costTable(1, 0.02, 0, 4),
});

/** 官方 V4 Pro：高峰 / 低谷两档。 */
const PRO = Object.freeze({
  currency: CNY,
  peak: costTable(9, 0.3, 0, 27),
  offpeak: costTable(4.5, 0.15, 0, 13.5),
});

/** 老模型没有峰谷价，按 CC Switch 的 USD 表 × 7 得到人民币平价。 */
const FLAT_CHAT = Object.freeze({
  currency: CNY,
  peak: costTable(3.08, 0.098, 0, 9.24),
  offpeak: costTable(3.08, 0.098, 0, 9.24),
});
const FLAT_V3 = Object.freeze({
  currency: CNY,
  peak: costTable(1.96, 0.196, 0, 7.77),
  offpeak: costTable(1.96, 0.196, 0, 7.77),
});
const FLAT_V31 = Object.freeze({
  currency: CNY,
  peak: costTable(3.85, 0.385, 0, 11.69),
  offpeak: costTable(3.85, 0.385, 0, 11.69),
});
const FLAT_V32 = Object.freeze({
  currency: CNY,
  peak: costTable(1.96, 0.196, 0, 2.94),
  offpeak: costTable(1.96, 0.196, 0, 2.94),
});

/** 模型 id → 费率；同一个模型的不同供应商别名都指向同一档。 */
export const DEFAULT_HOLIDAYS = DEFAULT_HOLIDAY_RANGES;

export const DEFAULT_MODEL_RATES = Object.freeze({
  "deepseek-flash": FLASH,
  "deepseek-v4-flash": FLASH,
  "deepseek-v4.1-flash": FLASH,
  "deepseek-v4-flash-0731": FLASH,
  "deepseek-v4-flash-vision-exp": FLASH,
  "deepseek-v4-pro": PRO,
  "deepseek-chat": FLAT_CHAT,
  "deepseek-reasoner": FLAT_CHAT,
  "deepseek-v3": FLAT_V3,
  "deepseek-v3.1": FLAT_V31,
  "deepseek-v3.2": FLAT_V32,
});

/** 费用按峰/谷拆分时，桶字段使用这些扁平前缀，便于聚合时直接相加。 */
export const WINDOW_FIELDS = Object.freeze([
  "peakHit",
  "peakMiss",
  "peakCacheWrite",
  "peakOutput",
  "offpeakHit",
  "offpeakMiss",
  "offpeakCacheWrite",
  "offpeakOutput",
]);

function dateKeyAt(ms, offsetSeconds) {
  return new Date(ms + offsetSeconds * 1000).toISOString().slice(0, 10);
}

/** 把日期/区间列表展开成 Set；非法项忽略。 */
function holidaySetOf(value) {
  const set = new Set();
  const source = Array.isArray(value) ? value : DEFAULT_HOLIDAY_RANGES;
  for (const item of source) {
    if (typeof item === "string") {
      if (/^\d{4}-\d{2}-\d{2}$/.test(item)) set.add(item);
      continue;
    }
    if (!Array.isArray(item) || item.length !== 2) continue;
    const [from, to] = item;
    if (typeof from !== "string" || typeof to !== "string") continue;
    const start = Date.parse(`${from}T00:00:00Z`);
    const end = Date.parse(`${to}T00:00:00Z`);
    if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) continue;
    for (let cursor = start; cursor <= end; cursor += 86_400_000) {
      set.add(new Date(cursor).toISOString().slice(0, 10));
    }
  }
  return set;
}

/** 归一化模型 id：大小写、空格、下划线差异不影响匹配。 */
export function normalizeModel(model) {
  return String(model ?? "")
    .trim()
    .toLowerCase()
    .replace(/_/g, "-")
    .replace(/\s+/g, "-");
}

/** 是否是工作日高峰时段；固定按 Asia/Shanghai，不随面板 tz 漂移。 */
export function isPeak(timeMs, options = {}) {
  const offsetSeconds = options.offsetSeconds ?? BEIJING_OFFSET_SECONDS;
  const intervals = options.peakIntervals ?? DEFAULT_PEAK_INTERVALS;
  const weekendOffpeak = options.weekendOffpeak !== false;
  const ms = Number.isFinite(timeMs) ? timeMs : 0;
  const shifted = new Date(ms + offsetSeconds * 1000);
  const day = shifted.getUTCDay();
  if (weekendOffpeak && (day === 0 || day === 6)) return false;
  const holidays = options.holidaySet ?? holidaySetOf(options.holidays);
  if (holidays.has(dateKeyAt(ms, offsetSeconds))) return false;
  const minutes = shifted.getUTCHours() * 60 + shifted.getUTCMinutes();
  return intervals.some(([start, end]) => minutes >= start && minutes < end);
}

function round6(value) {
  return Math.round(value * 1e6) / 1e6;
}

function totalOf(buckets) {
  return (
    (buckets.hit ?? 0) +
    (buckets.miss ?? 0) +
    (buckets.cacheWrite ?? 0) +
    (buckets.output ?? 0)
  );
}

/** 峰/谷拆分后的总 token；没有拆分时回退到普通桶。 */
function splitTotalOf(buckets) {
  let total = 0;
  for (const field of WINDOW_FIELDS) total += buckets[field] ?? 0;
  return total > 0 ? total : totalOf(buckets);
}

/**
 * 从模型名找费率；支持带日期/实验后缀的 V4 家族。
 * 未知模型返回 undefined，由调用方显式记成「未定价」。
 */
function rateOf(models, model) {
  const key = normalizeModel(model);
  if (models[key] !== undefined) return models[key];
  if (key.startsWith("deepseek-v4-flash")) return models["deepseek-v4-flash"];
  if (key.startsWith("deepseek-v4-pro")) return models["deepseek-v4-pro"];
  if (key.startsWith("deepseek-flash")) return models["deepseek-flash"];
  return undefined;
}

/**
 * 估算一组 token 桶的费用。
 *
 * @param {{model?: string, timeMs?: number, buckets?: object}} input
 * @param {object} [config]
 * @returns {{
 *   cost: number | null,
 *   currency: string,
 *   priced: boolean,
 *   pricedTokens: number,
 *   unpricedTokens: number,
 *   rate: string | null
 * }}
 */
export function estimateCost(input, config = {}) {
  const buckets = input?.buckets ?? input ?? {};
  const models = config.models ?? DEFAULT_MODEL_RATES;
  const table = rateOf(models, input?.model);
  const total = totalOf(buckets);
  if (table === undefined) {
    return {
      cost: null,
      currency: config.currency ?? CNY,
      priced: false,
      pricedTokens: 0,
      unpricedTokens: total,
      rate: null,
    };
  }

  const window = isPeak(input?.timeMs, config) ? "peak" : "offpeak";
  const prices = table[window] ?? table.offpeak ?? table;
  let cost = 0;
  let unpricedTokens = 0;
  for (const bucket of ["hit", "miss", "cacheWrite", "output"]) {
    const tokens = buckets[bucket] ?? 0;
    if (tokens <= 0) continue;
    const price = prices[bucket];
    if (typeof price !== "number" || !Number.isFinite(price)) {
      unpricedTokens += tokens;
      continue;
    }
    cost += (tokens / 1_000_000) * price;
  }
  const pricedTokens = total - unpricedTokens;
  return {
    cost: pricedTokens > 0 ? round6(cost) : null,
    currency: table.currency ?? config.currency ?? CNY,
    priced: pricedTokens > 0,
    pricedTokens,
    unpricedTokens,
    rate: window,
  };
}

/**
 * 创建供 `local-fold` / `local` 使用的定价器。
 *
 * 配置示例（`config.pricing`）：
 *
 * ```js
 * {
 *   enabled: true,
 *   currency: "CNY",
 *   models: {
 *     "deepseek-v4-pro": {
 *       peak: { miss: 9, hit: 0.3, cacheWrite: 0, output: 27 },
 *       offpeak: { miss: 4.5, hit: 0.15, cacheWrite: 0, output: 13.5 }
 *     }
 *   }
 * }
 * ```
 */
export function createPricing(config = {}) {
  const enabled = config.enabled !== false;
  const models = { ...DEFAULT_MODEL_RATES, ...(config.models ?? {}) };
  const holidaySet = holidaySetOf(config.holidays);
  const options = {
    currency: config.currency ?? CNY,
    offsetSeconds: config.offsetSeconds ?? BEIJING_OFFSET_SECONDS,
    peakIntervals: config.peakIntervals ?? DEFAULT_PEAK_INTERVALS,
    weekendOffpeak: config.weekendOffpeak !== false,
    holidaySet,
  };
  return {
    enabled,
    currency: options.currency,
    source: config.source ?? "DeepSeek 官方价 / CC Switch 同步",
    estimate(input) {
      if (!enabled) {
        return {
          cost: null,
          currency: options.currency,
          priced: false,
          pricedTokens: 0,
          unpricedTokens: totalOf(input?.buckets ?? input ?? {}),
          rate: null,
        };
      }
      return estimateCost(
        { ...input, model: input?.model },
        { models, ...options }
      );
    },
    /** 事件发生时刻落在高峰还是低谷。 */
    windowAt(timeMs) {
      return isPeak(timeMs, options) ? "peak" : "offpeak";
    },
    /**
     * 对已按峰/谷拆分的 token 桶计价。这样自定义费率只需要改价格，
     * 不需要重读会话日志。
     */
    quote(model, buckets = {}) {
      const total = splitTotalOf(buckets);
      const table = rateOf(models, model);
      if (!enabled || table === undefined) {
        return {
          cost: null,
          currency: options.currency,
          pricedTokens: 0,
          unpricedTokens: total,
        };
      }
      let cost = 0;
      let pricedTokens = 0;
      let unpricedTokens = 0;
      for (const window of ["peak", "offpeak"]) {
        const prices = table[window] ?? table.offpeak ?? table;
        for (const field of ["hit", "miss", "cacheWrite", "output"]) {
          const key = `${window}${field[0].toUpperCase()}${field.slice(1)}`;
          const tokens = buckets[key] ?? 0;
          if (tokens <= 0) continue;
          const price = prices[field];
          if (typeof price !== "number" || !Number.isFinite(price)) {
            unpricedTokens += tokens;
            continue;
          }
          cost += (tokens / 1_000_000) * price;
          pricedTokens += tokens;
        }
      }
      // 没有峰谷拆分（旧缓存）时，宁可标记未定价，也不按错误时段猜价格。
      if (pricedTokens === 0 && unpricedTokens === 0 && total > 0) unpricedTokens = total;
      return {
        cost: pricedTokens > 0 ? round6(cost) : null,
        currency: table.currency ?? options.currency,
        pricedTokens,
        unpricedTokens,
      };
    },
    rates() {
      return models;
    },
    meta() {
      return {
        enabled,
        currency: options.currency,
        source: config.source ?? "DeepSeek 官方价 / CC Switch 同步",
        peakIntervals: options.peakIntervals,
        offsetSeconds: options.offsetSeconds,
        weekendOffpeak: options.weekendOffpeak,
        holidayCount: holidaySet.size,
      };
    },
  };
}
