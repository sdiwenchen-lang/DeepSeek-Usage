import test from "node:test";
import assert from "node:assert/strict";
import { BUDGET_FAILURE, BUDGET_TZ, budgetDay, createBudget, createBudgetStore, validateBudgetConfig } from "../src/budget.js";

const config = (tokens = 0, cny = 0, mode = "local") => ({ mode, tokens: { enabled: tokens > 0, limit: tokens }, cny: { enabled: cny > 0, limit: cny } });
const payload = (tokens = 100, cost = 1) => ({ totals: { tokens, cost }, coverage: { complete: true, failed: 0, error: null, truncated: false }, costMeta: { complete: true, fxReady: true, enabled: true } });
const store = () => ({ available: () => true, value: null, async save(value) { this.value = structuredClone(value); } });
function setup(initial = config(100), data = payload(), extra = {}) {
  const queries = [];
  const storage = store();
  const budget = createBudget({ initial, local: { async query(options) { queries.push(options); return data; } }, store: storage, now: () => Date.parse("2026-11-06T12:00:00+08:00"), ...extra });
  return { budget, queries, storage };
}

test("equal token threshold blocks; either enabled limit uses OR", async () => {
  for (const [limits, data, blocked, reasons] of [
    [config(100), payload(99), false, []], [config(100), payload(100), true, ["tokens"]],
    [config(100, 2), payload(10, 2), true, ["cny"]], [config(100, 2), payload(100, 1), true, ["tokens"]],
    [config(100, 2), payload(100, 2), true, ["tokens", "cny"]],
  ]) {
    const { budget, queries } = setup(limits, data);
    const result = await budget.read();
    assert.equal(result.status.blocked, blocked);
    assert.deepEqual(result.status.reasons, reasons);
    assert.equal(queries[0].scope, "all");
    assert.equal(queries[0].tz, BUDGET_TZ);
    assert.equal(queries[0].force, true);
    assert.equal(queries[0].from, "2026-11-06");
    assert.equal(queries[0].to, "2026-11-06");
  }
});

test("local and official modes use their own daily totals", async () => {
  const local = { async query() { return payload(200, 144.58); } };
  const official = { async usage() { return { available: true, tokens: 10, cost: 4.66 }; } };
  const storage = store();
  const budget = createBudget({ initial: config(0, 144.5), local, official, store: storage, now: () => Date.parse("2026-11-06T12:00:00+08:00") });
  let result = await budget.read();
  assert.equal(result.status.mode, "local");
  assert.equal(result.status.blocked, true);
  assert.deepEqual(result.status.reasons, ["cny"]);
  assert.equal(await budget.blocked(), true);
  await budget.save({ mode: "official" });
  result = await budget.read();
  assert.equal(result.status.mode, "official");
  assert.equal(result.status.blocked, false);
  assert.equal(result.status.cny, 4.66);
  assert.equal(await budget.blocked(), false);
  assert.equal(storage.value.mode, "official");
});

test("official mode without a usable official source is incomplete and does not block", async () => {
  const budget = createBudget({ initial: config(0, 1, "official"), local: { async query() { return payload(); } }, now: () => Date.parse("2026-11-06T12:00:00+08:00") });
  const result = await budget.read();
  assert.equal(result.status.mode, "official");
  assert.equal(result.status.blocked, false);
  assert.equal(result.status.complete, false);
  assert.ok(result.status.incompleteReasons.includes("official-unavailable"));
});

test("light reads return config without waiting for usage status", async () => {
  const { budget, queries } = setup(config(100), payload(100));
  const value = await budget.read({ withStatus: false });
  assert.equal(value.status.pending, true);
  assert.equal(value.status.blocked, false);
  assert.equal(value.config.cny.limit, 0);
  assert.equal(queries.length, 0);
});

test("disabled guards do not query logs or interfere with the waterfall", async () => {
  const { budget, queries } = setup(config());
  const handlers = {};
  budget.register({ on(name, handler) { handlers[name] = handler; } });
  const chunks = [];
  for await (const chunk of handlers["llm/stream"](Object.freeze({ provider: "any", model: "any" }), async function* () { yield "ok"; })) chunks.push(chunk);
  assert.deepEqual(chunks, ["ok"]);
  assert.equal(queries.length, 0);
});

test("Beijing midnight resets with no timer or browser dependency", async () => {
  let clock = Date.parse("2026-11-06T15:59:59.999Z");
  const budget = createBudget({ initial: config(100), now: () => clock, local: { async query({ from }) { return payload(from === "2026-11-06" ? 100 : 0); } } });
  assert.equal(await budget.blocked(), true);
  assert.deepEqual(budgetDay(clock), { date: "2026-11-06", resetAt: Date.parse("2026-11-06T16:00:00Z") });
  clock++;
  assert.equal(await budget.blocked(), false);
  assert.equal((await budget.read()).status.date, "2026-11-07");
});

test("a scan spanning Beijing midnight rechecks the new day", async () => {
  let clock = Date.parse("2026-11-06T15:59:59.999Z");
  const dates = [];
  const budget = createBudget({ initial: config(100), now: () => clock, local: { async query({ from }) {
    dates.push(from);
    clock = Date.parse("2026-11-06T16:00:00Z");
    return payload(from === "2026-11-06" ? 100 : 0);
  } } });
  assert.equal(await budget.blocked(), false);
  assert.deepEqual(dates, ["2026-11-06", "2026-11-07"]);
});

test("configEditor targets the owning Loader entry even with multiple package instances", async () => {
  const own = { options: { name: "deepseek-usage" } };
  const other = { options: { name: "deepseek-usage" } };
  let target;
  const editor = { entries: () => [other, own], async edit(entry) { target = entry; } };
  const storage = createBudgetStore({ fiber: { entry: own }, get: () => editor });
  assert.equal(storage.available(), true);
  await storage.save(config());
  assert.equal(target, own);
  editor.entries = () => [other];
  assert.equal(storage.available(), false);
  await assert.rejects(storage.save(config()), /budget-storage-unavailable/);
});

test("unreadable, truncated or missing usage logs allow calls and report incomplete", async () => {
  for (const coverage of [{ failed: 1 }, { truncated: true }, { error: "list-failed" }, { complete: false, missingUsage: 1 }]) {
    const { budget } = setup(config(1, 1), { ...payload(), coverage });
    const result = await budget.read();
    assert.equal(result.status.blocked, false);
    assert.equal(result.status.complete, false);
    assert.ok(result.status.incompleteReasons.includes("logs-incomplete"));
  }
  const { budget } = setup(config(1), null, { local: { async query() { throw new Error("disk"); } } });
  assert.equal(await budget.blocked(), false);
});

test("missing rates allow money calls, while complete token limits remain independent", async () => {
  const data = { ...payload(), costMeta: { complete: false, unpricedTokens: 100 } };
  assert.equal(await setup(config(0, 1), data).budget.blocked(), false);
  const result = await setup(config(100, 1), data).budget.read();
  assert.equal(result.status.blocked, true);
  assert.deepEqual(result.status.reasons, ["tokens"]);
  assert.equal(result.status.costComplete, false);
});

test("config and effective rates survive restart; rates-only saves preserve limits", async () => {
  const { budget, storage } = setup(config());
  const rates = { schema: 2, usdToCny: 7.1, models: { "my-model": { input: 1, output: 2, cacheRead: 0, cacheWrite: 0 } }, hidden: [] };
  await budget.save({ config: config(200, 3), rates });
  assert.equal(storage.value.rates.usdToCny, 7.1);
  assert.equal(storage.value.rates.models["my-model"].output, 2);
  const restarted = setup(storage.value).budget;
  assert.deepEqual((await restarted.read()).config, config(200, 3));
  assert.equal((await restarted.read()).rates.usdToCny, 7.1);
  await budget.save({ rates: { ...rates, usdToCny: 7.2 } });
  assert.deepEqual((await budget.read()).config, config(200, 3));
  assert.equal(storage.value.rates.usdToCny, 7.2);
  await budget.save({ config: config(300) });
  assert.equal(storage.value.rates.usdToCny, 7.2);
});

test("separate plugin generations merge config-only and rates-only writes in configEditor", async () => {
  const entry = { options: { name: "deepseek-usage" } };
  let raw = {};
  const editor = { entries: () => [entry], async edit(_entry, change) { raw = change(raw); } };
  const ctx = { fiber: { entry }, get: () => editor };
  const first = setup(config(), payload(), { store: createBudgetStore(ctx) }).budget;
  const second = setup(config(), payload(), { store: createBudgetStore(ctx) }).budget;
  const rates = { schema: 2, usdToCny: 8.2, models: {}, hidden: [] };
  await first.save({ config: config(400) });
  const savedRates = await second.save({ rates });
  assert.deepEqual(savedRates.config, config(400));
  assert.equal(raw.budget.rates.usdToCny, 8.2);
  const savedConfig = await first.save({ config: config(500) });
  assert.equal(savedConfig.rates.usdToCny, 8.2);
});

test("failed persistence does not activate limits", async () => {
  const { budget } = setup(config(), payload(), { store: { available: () => false, async save() { throw new Error("unavailable"); } } });
  await assert.rejects(budget.save({ config: config(1) }), /unavailable/);
  assert.equal(await budget.blocked(), false);
  assert.equal((await budget.read()).status.storageAvailable, false);
});

test("host configEditor preserves other config and refuses ambiguous entries", async () => {
  const entry = { options: { name: "deepseek-usage" } };
  let saved;
  const editor = { entries: () => [entry], async edit(target, change) { assert.equal(target, entry); saved = change({ local: { enabled: true }, cacheTtlMs: 5 }); } };
  const hostStore = createBudgetStore({ get: (name) => name === "configEditor" ? editor : undefined });
  await hostStore.save(config(10));
  assert.equal(saved.cacheTtlMs, 5);
  assert.deepEqual(saved.budget, config(10));
  editor.entries = () => [entry, { options: { name: "deepseek-usage" } }];
  assert.equal(hostStore.available(), false);
  await assert.rejects(hostStore.save(config(10)), /budget-storage-unavailable/);
});

test("blocked stream never reaches provider, surfaces the failure, and keeps retries terminal", async () => {
  const { budget } = setup(config(100));
  const handlers = {};
  budget.register({ on(name, handler, options) { assert.equal(options.prepend, true); handlers[name] = handler; } });
  assert.equal(handlers["agent/pre-step"], undefined);
  const never = () => { assert.fail("must not enter downstream callback"); };
  const chunks = [];
  const options = Object.freeze({ provider: "any-provider", model: "any-model", sessionId: "a" });
  for await (const chunk of handlers["llm/stream"](options, never)) chunks.push(chunk);
  assert.equal(chunks.length, 1);
  assert.equal(chunks[0].type, "finish");
  assert.equal(chunks[0].reason.failure.code, BUDGET_FAILURE);
  assert.match(chunks[0].reason.failure.message, /已达到每日限额/);
  assert.equal(handlers["agent/request-error"]({ failure: { code: BUDGET_FAILURE }, retryPolicy: { mode: "always" } }, never), undefined);
  assert.equal(handlers["agent/request-error"]({ failure: { code: "other" } }, () => "delegate"), "delegate");
});

test("an admitted in-flight call completes after another call crosses the limit", async () => {
  let tokens = 0;
  const { budget } = setup(config(100), null, { local: { async query() { return payload(tokens); } } });
  const handlers = {};
  budget.register({ on(name, handler) { handlers[name] = handler; } });
  const stream = handlers["llm/stream"]({}, async function* () { yield "first"; tokens = 100; yield "last"; });
  assert.equal((await stream.next()).value, "first");
  assert.equal((await stream.next()).value, "last");
  assert.equal(await budget.blocked(), true);
});

test("budget validation rejects unsafe and nonsensical thresholds", () => {
  for (const bad of [null, {}, [], { ...config(), extra: true }, { ...config(), tokens: { enabled: true, limit: 0 } },
    { ...config(), tokens: { enabled: true, limit: 1.2 } }, { ...config(), cny: { enabled: true, limit: Infinity } },
    { ...config(), cny: { enabled: "yes", limit: 2 } }, { ...config(), mode: "other" }]) assert.throws(() => validateBudgetConfig(bad), /invalid-budget/);
});
