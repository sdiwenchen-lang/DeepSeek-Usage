/** Offline ccSwitch standard prices; four exclusive token channels, USD / million tokens. */
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
export const DEFAULT_SNAPSHOT = require("./pricing.snapshot.json");
export const DEFAULT_USD_TO_CNY = 6.7;
export const UNPRICED = "unpriced";
const PRICE_FIELDS = ["input", "output", "cacheRead", "cacheWrite"];
const TOKEN_FIELDS = ["hit", "miss", "cacheWrite", "output"];
const own = (value, key) => Object.prototype.hasOwnProperty.call(value, key);
function nonnegative(value, label) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw new TypeError(`${label} must be a finite nonnegative number`);
  }
  return value;
}
function num(value) { return value === undefined ? 0 : nonnegative(value, "tokens"); }
function totalOf(row) { return TOKEN_FIELDS.reduce((n, key) => n + num(row?.[key]), 0); }
function round4(n) { return Math.round(n * 1e4) / 1e4; }
function round6(n) { return Math.round(n * 1e6) / 1e6; }
export function normalizeModelKey(id) {
  return String(id ?? "").trim().toLowerCase()
    .replace(/^[a-z0-9_.-]+\//, "")
    .replace(/@[\w.-]+$/, "")
    .replace(/_/g, "-").replace(/\s+/g, "-")
    .replace(/-(\d{8}|\d{4}-\d{2}-\d{2})$/, "")
    .replace(/-(latest|stable|preview|exp|beta|alpha)$/, "");
}
export const normalizeModel = normalizeModelKey;

export function createPricer(opts = {}) {
  const snapshot = opts.snapshot ?? DEFAULT_SNAPSHOT;
  const usdToCny = nonnegative(opts.usdToCny ?? 0, "usdToCny") || DEFAULT_USD_TO_CNY;
  const familyFallback = opts.familyFallback === true;
  const cacheReadZero = opts.cacheReadZero === "input" ? "input" : "respect";
  const byId = new Map(), byKey = new Map(), byName = new Map();
  const conflicts = [];
  if (!Array.isArray(snapshot?.models)) throw new TypeError("snapshot.models must be an array");
  if (snapshot.unit && snapshot.unit !== "USD_PER_MILLION_TOKENS") throw new TypeError("unsupported pricing unit");
  for (const row of snapshot.models) {
    if (!Array.isArray(row) || row.length !== 6 || typeof row[0] !== "string" || !row[0].trim()) {
      throw new TypeError("invalid pricing snapshot row");
    }
    const [id, name, input, output, cacheRead, cacheWrite] = row;
    const entry = { id, name: String(name ?? id), input, output, cacheRead, cacheWrite, cacheReadListed: cacheRead };
    for (const key of PRICE_FIELDS) nonnegative(entry[key], `${id}.${key}`);
    if (cacheRead === 0 && cacheReadZero === "input") entry.cacheRead = input;
    const raw = id.trim().toLowerCase();
    if (byId.has(raw)) throw new TypeError(`duplicate pricing model: ${id}`);
    byId.set(raw, entry);
    const key = normalizeModelKey(id);
    const first = byKey.get(key);
    if (!first) byKey.set(key, entry);
    else if (PRICE_FIELDS.some((field) => first[field] !== entry[field])) conflicts.push(`${key}: ${first.id} vs ${entry.id}`);
    const display = normalizeModelKey(entry.name);
    if (!byName.has(display)) byName.set(display, entry);
  }
  const keys = [...byKey.keys()].sort((a, b) => b.length - a.length);
  function resolve(id) {
    const raw = String(id ?? "").trim().toLowerCase();
    if (!raw) return null;
    if (byId.has(raw)) return byId.get(raw);
    const key = normalizeModelKey(raw);
    if (byKey.has(key)) return byKey.get(key);
    if (byName.has(key)) return byName.get(key);
    if (familyFallback) for (const prefix of keys) if (key.startsWith(prefix)) return byKey.get(prefix);
    return null;
  }
  function estimate(tokens, entry) {
    if (!entry) return null;
    const hit = num(tokens?.hit), miss = num(tokens?.miss), outputTokens = num(tokens?.output), write = num(tokens?.cacheWrite);
    for (const key of PRICE_FIELDS) nonnegative(entry[key], key);
    const cacheRead = hit * entry.cacheRead / 1e6;
    const input = miss * entry.input / 1e6;
    const output = outputTokens * entry.output / 1e6;
    const cacheWrite = write * entry.cacheWrite / 1e6;
    const total = cacheRead + input + output + cacheWrite;
    if (!Number.isFinite(total)) throw new RangeError("pricing amount overflow");
    return { cacheRead, input, output, cacheWrite, total, tokens: { hit, miss, output: outputTokens, cacheWrite: write } };
  }
  function costOf(row) {
    const entry = resolve(row?.model);
    if (!entry) return null;
    return { ...estimate(row, entry), model: entry.id, name: entry.name };
  }
  function toCny(usd) { return usd === null || !usdToCny ? null : nonnegative(usd, "usd") * usdToCny; }
  return { resolve, estimate, costOf, toCny,
    meta: { version: snapshot.schema ?? 1, source: snapshot.source ?? "unknown", generatedAt: snapshot.generatedAt ?? "", count: byId.size, usdToCny, familyFallback, cacheReadZero, conflicts } };
}

/** Adapter used by local aggregation. Legacy CNY window overrides are retained only as diagnostics. */
export function createPricing(config = {}) {
  const enabled = config.enabled !== false;
  const legacyModels = [];
  const models = new Map((config.snapshot ?? DEFAULT_SNAPSHOT).models.map((row) => [row[0], [...row]]));
  const base = createPricer({ snapshot: config.snapshot ?? DEFAULT_SNAPSHOT });
  for (const [id, rates] of Object.entries(config.models ?? {})) {
    if (!rates || typeof rates !== "object") throw new TypeError(`invalid rates: ${id}`);
    if (own(rates, "peak") || own(rates, "offpeak") || own(rates, "hit") || own(rates, "miss") || rates.currency === "CNY") {
      legacyModels.push(id);
      continue;
    }
    if (rates.currency !== undefined && rates.currency !== "USD") throw new TypeError(`unsupported rates currency: ${id}`);
    for (const field of PRICE_FIELDS) nonnegative(rates[field], `${id}.${field}`);
    // Resolve aliases before replacement, so an override cannot lose to the snapshot's normalized entry.
    const canonical = base.resolve(id)?.id ?? id.trim().toLowerCase();
    if (!canonical || ["__proto__", "constructor", "prototype"].includes(canonical)) throw new TypeError("invalid model key");
    const previous = models.get(canonical);
    models.set(canonical, [canonical, previous?.[1] ?? canonical, ...PRICE_FIELDS.map((field) => rates[field])]);
  }
  const snapshot = { ...(config.snapshot ?? DEFAULT_SNAPSHOT), models: [...models.values()] };
  const pricer = createPricer({ ...config, snapshot });
  const fxReady = pricer.meta.usdToCny > 0;
  function quote(model, buckets = {}) {
    const total = totalOf(buckets);
    const amount = enabled ? pricer.costOf({ ...buckets, model }) : null;
    const pricedTokens = amount ? total : 0;
    const usd = total === 0 ? 0 : amount?.total ?? null;
    const cost = total === 0 ? 0 : pricer.toCny(usd);
    return { cost, usd, currency: "CNY", fxReady, usdToCny: pricer.meta.usdToCny,
      priced: amount !== null, pricedTokens, unpricedTokens: total - pricedTokens,
      costComplete: total === pricedTokens, rate: amount?.model ?? null };
  }
  function tables() {
    return Object.fromEntries(snapshot.models.map(([id, , input, output, cacheRead, cacheWrite]) => [id, { input, output, cacheRead, cacheWrite }]));
  }
  function names() {
    return Object.fromEntries(snapshot.models.map(([id, name]) => [id, name || id]));
  }
  return { enabled, currency: "CNY", quote, pricer,
    estimate: (input) => quote(input?.model, input?.buckets ?? input ?? {}),
    tables, rates: tables, names,
    meta: () => ({ ...pricer.meta, schema: 2, unit: "USD_PER_MILLION_TOKENS", currency: "CNY", enabled,
      estimated: true, fxReady, legacyModels, snapshot: { schema: snapshot.schema, source: snapshot.source, generatedAt: snapshot.generatedAt, count: snapshot.models.length } }),
  };
}
export function estimateCost(input, config = {}) { return createPricing(config).estimate(input); }

export function summarizeCost(rows, pricer, weigh = totalOf) {
  const byModel = new Map(), unpriced = new Set();
  let usd = 0, pricedWeight = 0, totalWeight = 0;
  for (const row of rows ?? []) {
    const weight = nonnegative(weigh(row), "weight");
    totalWeight += weight;
    const cost = pricer?.costOf(row);
    if (!cost) { if (weight) unpriced.add(String(row.model ?? UNPRICED)); continue; }
    pricedWeight += weight;
    usd += cost.total;
    const item = byModel.get(cost.model) ?? { model: cost.model, name: cost.name, usd: 0, tokens: { hit: 0, miss: 0, output: 0, cacheWrite: 0 } };
    item.usd += cost.total;
    for (const field of TOKEN_FIELDS) item.tokens[field] += cost.tokens[field];
    byModel.set(cost.model, item);
  }
  const amount = totalWeight === 0 ? 0 : pricedWeight > 0 ? usd : null;
  return { usd: amount, cny: amount === 0 && totalWeight === 0 ? 0 : pricer?.toCny(amount) ?? null,
    priced: byModel.size, total: byModel.size + unpriced.size,
    coverage: totalWeight ? round4(pricedWeight / totalWeight) : 0,
    unpriced: [...unpriced].sort(), byModel: [...byModel.values()].sort((a, b) => b.usd - a.usd) };
}

export const CACHE_LEVELS = [
  { key: "excellent", min: 0.7, label: "优秀" },
  { key: "good", min: 0.4, label: "良好" },
  { key: "fair", min: 0.15, label: "偏低" },
  { key: "poor", min: 0, label: "很低" },
];
function levelOf(rate, levels) { return rate === null ? "n/a" : (levels.find((level) => rate >= level.min)?.key ?? "n/a"); }

/** Local inputs include independent cache writes; an optional three-channel basis suits official usage. */
export function analyzeCache(rows, pricer, opts = {}) {
  const levels = opts.levels?.length ? opts.levels : CACHE_LEVELS;
  const includeWrites = opts.includeWrites !== false;
  const byModel = new Map();
  let hit = 0, miss = 0, output = 0, cacheWrite = 0;
  for (const row of rows ?? []) {
    const h = num(row.hit), m = num(row.miss), o = num(row.output), w = num(row.cacheWrite);
    hit += h; miss += m; output += o; cacheWrite += w;
    const model = String(row.model ?? UNPRICED);
    const item = byModel.get(model) ?? { model, hit: 0, miss: 0, output: 0, cacheWrite: 0 };
    item.hit += h; item.miss += m; item.output += o; item.cacheWrite += w;
    byModel.set(model, item);
  }
  const input = hit + miss + (includeWrites ? cacheWrite : 0);
  const hitRate = input ? hit / input : null;
  let cacheReadUsd = 0, inputUsd = 0, outputUsd = 0, writeUsd = 0, listInputUsd = 0, sensitivityUsd = 0;
  let pricedInput = 0, pricedTokens = 0, savedUsd = 0;
  const unpriced = [], notBilled = [], assumed = [], models = [];
  for (const row of byModel.values()) {
    const entry = pricer?.resolve(row.model);
    const count = row.hit + row.miss + (includeWrites ? row.cacheWrite : 0);
    const rate = count ? row.hit / count : null;
    if (!entry) {
      unpriced.push(row.model);
      models.push({ ...row, name: row.model, input: count, hitRate: rate === null ? null : round4(rate), level: levelOf(rate, levels), priced: false, saved: null, cacheReadPerM: null });
      continue;
    }
    const amount = pricer.estimate(row, entry);
    pricedTokens += totalOf(row); pricedInput += count;
    cacheReadUsd += amount.cacheRead; inputUsd += amount.input; outputUsd += amount.output; writeUsd += amount.cacheWrite;
    // Cache writes remain charged identically in the all-miss baseline; only read hits produce savings.
    const baseline = (row.hit + row.miss) * entry.input / 1e6 + (includeWrites ? amount.cacheWrite : 0);
    listInputUsd += baseline;
    const saved = row.hit * (entry.input - entry.cacheRead) / 1e6;
    savedUsd += saved;
    sensitivityUsd += Math.min(row.miss, 0.1 * count) * Math.max(0, entry.input - entry.cacheRead) / 1e6;
    if (entry.cacheReadListed === 0) (entry.cacheRead === 0 ? notBilled : assumed).push(entry.id);
    models.push({ ...row, name: entry.name, input: count, hitRate: rate === null ? null : round4(rate), level: levelOf(rate, levels),
      priced: true, saved: round6(saved), cacheReadPerM: entry.cacheRead,
      effectiveInputPerM: count ? round6((amount.cacheRead + amount.input + (includeWrites ? amount.cacheWrite : 0)) * 1e6 / count) : null });
  }
  const covered = pricedInput > 0, moneyCovered = pricedTokens > 0;
  const inputCost = cacheReadUsd + inputUsd + (includeWrites ? writeUsd : 0);
  return { basis: "input-token-weighted", includesCacheWrite: includeWrites,
    tokens: { hit, miss, output, cacheWrite, input, total: hit + miss + cacheWrite + output },
    hitRate: hitRate === null ? null : round4(hitRate), missRate: hitRate === null ? null : round4(1 - hitRate),
    level: levelOf(hitRate, levels), levels: levels.map((level) => ({ ...level })),
    price: { effectiveInputPerM: covered ? round6(inputCost * 1e6 / pricedInput) : null,
      listInputPerM: covered ? round6(listInputUsd * 1e6 / pricedInput) : null,
      discountPct: covered && listInputUsd > 0 ? round4(savedUsd / listInputUsd) : null },
    usd: { cacheRead: moneyCovered ? round6(cacheReadUsd) : null, input: moneyCovered ? round6(inputUsd) : null,
      output: moneyCovered ? round6(outputUsd) : null, cacheWrite: moneyCovered ? round6(writeUsd) : null,
      listInput: covered ? round6(listInputUsd) : null, saved: covered ? round6(savedUsd) : null,
      total: moneyCovered ? round6(cacheReadUsd + inputUsd + outputUsd + writeUsd) : null },
    sensitivity: { plus10ppUsd: covered ? round6(sensitivityUsd) : null },
    coverage: input ? round4(pricedInput / input) : 0,
    models: models.sort((a, b) => (b.saved ?? -Infinity) - (a.saved ?? -Infinity)).slice(0, 12),
    notBilled: [...new Set(notBilled)].sort(), assumed: [...new Set(assumed)].sort(), unpriced: unpriced.sort() };
}

export function compareWith(rows, baselineModel, pricer) {
  const entry = pricer.resolve(baselineModel);
  if (!entry) return null;
  const tokens = { hit: 0, miss: 0, output: 0, cacheWrite: 0 };
  for (const row of rows ?? []) for (const field of TOKEN_FIELDS) tokens[field] += num(row[field]);
  const amount = pricer.estimate(tokens, entry);
  return { model: entry.id, name: entry.name, usd: amount.total, tokens };
}
