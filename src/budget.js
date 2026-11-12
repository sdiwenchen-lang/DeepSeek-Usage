/** Profile-wide daily limits. Usage follows the active source mode: local logs or the official bill. */
import { createPricing, DEFAULT_SNAPSHOT } from "./pricing.js";

export const BUDGET_FAILURE = "deepseek-usage-budget-exceeded";
export const BUDGET_TZ = 28_800;
const DAY_MS = 86_400_000;
const copy = (value) => structuredClone(value);
const object = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const invalid = () => { throw Object.assign(new Error("invalid-budget"), { code: "invalid-budget" }); };

export function validateBudgetConfig(value) {
  if (!object(value) || Object.keys(value).some((key) => !["tokens", "cny", "mode"].includes(key))) return invalid();
  const mode = value.mode === undefined ? "official" : value.mode;
  if (mode !== "local" && mode !== "official") return invalid();
  const config = { mode };
  for (const key of ["tokens", "cny"]) {
    const item = value[key];
    if (!object(item) || Object.keys(item).some((field) => !["enabled", "limit"].includes(field)) ||
        typeof item.enabled !== "boolean" || typeof item.limit !== "number" || !Number.isFinite(item.limit) ||
        item.limit < 0 || (item.enabled && item.limit <= 0) ||
        (key === "tokens" && !Number.isSafeInteger(item.limit))) return invalid();
    config[key] = { enabled: item.enabled, limit: item.limit };
  }
  return config;
}

export function budgetDay(now) {
  const start = Math.floor((now + BUDGET_TZ * 1000) / DAY_MS) * DAY_MS - BUDGET_TZ * 1000;
  return { date: new Date(start + BUDGET_TZ * 1000).toISOString().slice(0, 10), resetAt: start + DAY_MS };
}

/** configEditor owns validation, atomic persistence, and Loader reconciliation. */
export function createBudgetStore(ctx) {
  const target = () => {
    const editor = typeof ctx.get === "function" ? ctx.get("configEditor") : undefined;
    if (!editor) return null;
    const entries = editor.entries();
    const owned = ctx.fiber?.entry;
    if (owned !== undefined) return entries.includes(owned) ? { editor, entry: owned } : null;
    const matches = entries.filter((entry) => entry.options?.name === "deepseek-usage");
    return matches.length === 1 ? { editor, entry: matches[0] } : null;
  };
  return {
    available: () => { try { return target() !== null; } catch { return false; } },
    async save(budget, changed = { config: true, rates: true }) {
      const found = target();
      if (!found) throw Object.assign(new Error("budget-storage-unavailable"), { code: "budget-storage-unavailable" });
      let saved;
      await found.editor.edit(found.entry, (current) => {
        saved = { ...copy(budget), ...copy(current.budget ?? {}) };
        if (changed.config) { saved.mode = budget.mode; saved.tokens = copy(budget.tokens); saved.cny = copy(budget.cny); }
        else if (changed.mode) saved.mode = budget.mode;
        if (changed.rates && budget.rates !== undefined) saved.rates = copy(budget.rates);
        return { ...current, budget: saved };
      });
      return saved;
    },
  };
}

export function createBudget({ local, official, pricing = local?.pricing, initial = {}, store, now = Date.now, logger } = {}) {
  let config = validateBudgetConfig({
    mode: initial.mode ?? "official",
    tokens: initial.tokens ?? { enabled: false, limit: 0 },
    cny: initial.cny ?? { enabled: false, limit: 0 },
  });
  let ratesSaved = initial.rates !== undefined;
  const defaultPricing = pricing ?? createPricing();
  const defaultTables = defaultPricing.tables();
  let rates = initial.rates ? copy(initial.rates) : {
    schema: 2, usdToCny: defaultPricing.meta().usdToCny, models: defaultTables,
    hidden: DEFAULT_SNAPSHOT.models.filter(([id]) => !Object.hasOwn(defaultTables, id)).map(([id]) => id),
  };
  // Resolve sparse overrides once, then persist the exact effective table on save.
  function effective(value) {
    const resolved = createPricing({ ...value, enabled: true });
    return { schema: 2, usdToCny: resolved.meta().usdToCny, models: resolved.tables(), hidden: [...(value.hidden ?? [])] };
  }
  rates = effective(rates);
  const enabled = () => config.tokens.enabled || config.cny.enabled;
  const available = () => store?.available?.() === true;

  async function status(currentConfig = config, currentRates = rates) {
    const checkedAt = now();
    const day = budgetDay(checkedAt);
    let data = null;
    const incompleteReasons = [];
    if (currentConfig.mode === "official") {
      if (!official?.usage) incompleteReasons.push("official-unavailable");
      else {
        try {
          const value = await official.usage({ force: false });
          if (value?.available === false || !value) incompleteReasons.push(value?.error ?? "official-unavailable");
          else data = {
            totals: { tokens: value.tokens, cost: value.cost },
            coverage: { complete: true },
            costMeta: { complete: true, fxReady: true, enabled: true },
          };
        } catch (error) {
          incompleteReasons.push(error?.code ?? "official-query-failed");
        }
      }
    } else {
      try {
        data = await local?.query({ from: day.date, to: day.date, tz: BUDGET_TZ, scope: "all", force: true, rates: { ...copy(currentRates), enabled: true }, now: checkedAt });
        if (!data) incompleteReasons.push("local-unavailable");
      } catch (error) {
        incompleteReasons.push(error?.code ?? "local-query-failed");
      }
    }
    if (budgetDay(now()).date !== day.date) return status(currentConfig, currentRates);
    const coverage = data?.coverage;
    if (data && (!coverage || coverage.error || coverage.failed > 0 || coverage.truncated || coverage.complete === false || coverage.incomplete === true)) {
      incompleteReasons.push("logs-incomplete");
    }
    const tokens = data?.totals?.tokens;
    const cny = data?.totals?.cost;
    const valid = (value) => typeof value === "number" && Number.isFinite(value) && value >= 0;
    const tokenComplete = data !== null && incompleteReasons.length === 0 && valid(tokens);
    if (data && !valid(tokens)) incompleteReasons.push("tokens-unavailable");
    const costComplete = tokenComplete && valid(cny) && data.costMeta?.complete === true && data.costMeta?.fxReady !== false && data.costMeta?.enabled !== false;
    if (data && !costComplete) incompleteReasons.push("cost-incomplete");
    // Partial totals are a known lower bound; missing usage cannot undo a crossed limit.
    const costUsable = valid(cny) && data?.costMeta?.fxReady !== false && data?.costMeta?.enabled !== false;
    const reasons = [];
    if (currentConfig.tokens.enabled && valid(tokens) && tokens >= currentConfig.tokens.limit) reasons.push("tokens");
    if (currentConfig.cny.enabled && costUsable && cny >= currentConfig.cny.limit) reasons.push("cny");
    return { ...day, guardPolicy: "known-usage", timezone: "Asia/Shanghai", mode: currentConfig.mode, enabled: currentConfig.tokens.enabled || currentConfig.cny.enabled, blocked: reasons.length > 0, reasons,
      tokens: valid(tokens) ? tokens : null, cny: valid(cny) ? cny : null,
      complete: tokenComplete && costComplete, tokenComplete, costComplete,
      incompleteReasons: [...new Set(incompleteReasons)], checkedAt, storageAvailable: available() };
  }

  async function read({ withStatus = true } = {}) {
    const currentConfig = config, currentRates = rates;
    if (!withStatus) {
      const day = budgetDay(now());
      return {
        ok: true, config: copy(currentConfig), storageAvailable: available(), rates: copy(currentRates), ratesSaved,
        status: {
          ...day, timezone: "Asia/Shanghai", mode: currentConfig.mode,
          enabled: currentConfig.tokens.enabled || currentConfig.cny.enabled,
          blocked: false, tokens: null, cny: null, pending: true,
          tokenComplete: true, costComplete: true, complete: true, incompleteReasons: [],
        },
      };
    }
    return { ok: true, config: copy(currentConfig), status: await status(currentConfig, currentRates), rates: copy(currentRates), ratesSaved };
  }
  // Serialize saves so an overlapping browser cannot overwrite a newer in-memory setting.
  let saving = Promise.resolve();
  function save(input) {
    const next = input.config === undefined ? undefined : validateBudgetConfig(input.config);
    const supplied = input.rates === undefined ? undefined : effective(input.rates);
    const mode = input.mode === undefined ? undefined : input.mode;
    if (mode !== undefined && mode !== "local" && mode !== "official") return invalid();
    if (next === undefined && supplied === undefined && mode === undefined) return invalid();
    const operation = saving.then(async () => {
      const nextConfig = { ...(next ?? config), mode: mode ?? next?.mode ?? config.mode };
      const nextRates = supplied ?? rates;
      if (!store?.save) throw Object.assign(new Error("budget-storage-unavailable"), { code: "budget-storage-unavailable" });
      const persisted = await store.save({ ...nextConfig, rates: copy(nextRates) }, { config: next !== undefined, mode: mode !== undefined, rates: supplied !== undefined });
      config = persisted ? validateBudgetConfig({ mode: persisted.mode, tokens: persisted.tokens, cny: persisted.cny }) : nextConfig;
      rates = effective(persisted?.rates ?? nextRates);
      ratesSaved = ratesSaved || supplied !== undefined || persisted?.rates !== undefined;
      return read();
    });
    saving = operation.catch(() => {});
    return operation;
  }

  async function blocked() { return enabled() && (await status()).blocked; }
  function register(ctx) {
    // Do not reject at agent/pre-step: a rejected step ends the turn as `blocked`
    // without any visible reason. Let the step reach llm/stream so the failure is
    // recorded in the conversation.
    ctx.on("llm/stream", async function* (_options, next) {
      if (await blocked()) {
        yield { type: "finish", reason: { kind: "error", failure: { code: BUDGET_FAILURE, message: "已达到每日限额，后续模型调用已熔断；可在用量面板提高限额，或等待次日 00:00 重置。" } } };
        return;
      }
      // Admission is checked once: an in-flight request is allowed to finish.
      yield* next();
    }, { prepend: true });
    ctx.on("agent/request-error", (payload, next) => {
      if (payload.failure?.code === BUDGET_FAILURE) return undefined;
      return next();
    }, { prepend: true });
  }
  return { read, save, blocked, register };
}
