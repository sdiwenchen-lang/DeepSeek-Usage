import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFileSync } from "node:fs";
import { BUDGET_FAILURE, createBudget } from "../src/budget.js";

const source = readFileSync(new URL("../src/client.js", import.meta.url), "utf8");
const plain = value => JSON.parse(JSON.stringify(value));
const rate = (input) => ({ input, output: 3, cacheRead: 0, cacheWrite: 0 });
const host = { ratesSaved: true, rates: { schema: 2, usdToCny: 7.9, models: { "deepseek-flash": rate(9), custom: rate(0) }, hidden: ["kimi-k3"] } };
function browser(saved = {}) {
  const storage = new Map(Object.entries(saved).map(([key, value]) => [key, JSON.stringify(value)]));
  const context = vm.createContext({ window: { localStorage: { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) } } });
  const api = vm.runInContext(source.slice(source.indexOf("function readJSON("), source.indexOf("function seatGlyph(")) + "\n({readRates,restoreRates,ratesParam,getBudget,readSeat,readRaw,readJSON,writeJSON});", context);
  return { api, context, storage };
}

test("token limits round trip and block the next request at each unit's maximum", async () => {
  const fragment = source.slice(source.indexOf("function budgetLimit("), source.indexOf("function BudgetSettings("));
  const api = vm.runInNewContext(fragment + "\n({budgetLimit,budgetDraftValues,createBudgetSaver});");
  for (const tokenUnit of ["100000000", "10000000", "1000000"]) {
    const expected = 999 * Number(tokenUnit);
    const initial = { mode: "local", tokens: { enabled: false, limit: 0 }, cny: { enabled: true, limit: 12 } };
    let used = expected - 1, persisted;
    const budget = createBudget({ initial, store: { async save(config) { persisted = config; } }, local: { async query() {
      return { totals: { tokens: used, cost: 0 }, coverage: { complete: true }, costMeta: { complete: true } };
    } } });
    const save = api.createBudgetSaver(body => budget.save(plain(body)), initial, "local");
    const draft = { tokens: "999", tokenUnit, cny: "999" };
    assert.equal((await save(draft, "tokens")).status.blocked, false);
    assert.deepEqual(persisted.tokens, { enabled: true, limit: expected });
    assert.deepEqual(persisted.cny, initial.cny);
    const restored = api.budgetDraftValues(persisted, tokenUnit);
    assert.equal(restored.tokens, "999");
    assert.equal(restored.tokenUnit, tokenUnit);
    const reopened = api.budgetDraftValues(persisted);
    assert.equal(api.budgetLimit(reopened, "tokens").limit, expected);
    let stream;
    budget.register({ on(name, handler) { if (name === "llm/stream") stream = handler; } });
    for (const [total, blocked] of [[expected - 1, false], [expected, true], [expected + 1, true]]) {
      used = total;
      let called = false;
      const chunks = [];
      for await (const chunk of stream({}, async function* () { called = true; yield "ok"; })) chunks.push(chunk);
      assert.equal(called, !blocked);
      assert.equal(blocked ? chunks[0].reason.failure.code : chunks[0], blocked ? BUDGET_FAILURE : "ok");
    }
    assert.throws(() => save({ ...draft, tokens: "1000" }, "tokens"), /最多 999/);
    assert.equal((await save({ ...draft, tokens: "0" }, "tokens")).status.blocked, false);
  }
  assert.equal(api.budgetLimit({ tokens: "0.5", tokenUnit: "1000000" }, "tokens").limit, 500000);
  assert.equal(api.budgetLimit(api.budgetDraftValues({ tokens: { enabled: true, limit: 1 }, cny: { enabled: false } }), "tokens").limit, 1);
  assert.throws(() => api.budgetLimit({ tokens: "1", tokenUnit: "1000000000" }, "tokens"), /请选择亿、千万或百万单位/);
  assert.throws(() => api.budgetLimit({ tokens: "0.0000001", tokenUnit: "1000000" }, "tokens"), /整数 Token/);
});

test("empty or stale browser pricing restores saved host prices, FX and hidden models without POST", () => {
  for (const initial of [{}, { deepseekUsagePricingV2: { schema: 2, usdToCny: 6.7, models: {} } }]) {
    const { api } = browser(initial);
    api.restoreRates(host);
    assert.deepEqual(plain(api.readRates()), host.rates);
    // Changing only FX must carry all restored model prices and removals.
    api.writeJSON("deepseekUsagePricingV2", { ...api.readRates(), usdToCny: 8.1 });
    assert.deepEqual(plain(api.readRates().models), host.rates.models);
    assert.deepEqual(plain(api.readRates().hidden), host.rates.hidden);
  }
});

test("unsaved host defaults do not replace legacy browser prices or a newer local edit", () => {
  const { api, context } = browser({ deepseekUsagePricingV2: host.rates });
  api.restoreRates({ ratesSaved: false, rates: { schema: 2, usdToCny: 6.7, models: {} } });
  assert.deepEqual(plain(api.readRates()), host.rates);
  vm.runInContext("ratesEdited = true", context);
  api.restoreRates({ ratesSaved: true, rates: { schema: 2, usdToCny: 1, models: {} } });
  assert.deepEqual(plain(api.readRates()), host.rates);
});

test("existing sidebar choices and other appearance settings survive a new client context", () => {
  const seat = { order: ["spend", "requests", "tokens"], spend: { on: false, label: "消费", icon: "yen", img: "" }, tokens: { on: true, label: "用量", icon: "layers", img: "" }, requests: { on: true, label: "请求", icon: "activity", img: "data:image/png;base64,user" } };
  const { api } = browser({ deepseekUsageSeat: seat, deepseekUsageTheme: { name: "green" }, deepseekUsageAutoRefresh: false, deepseekUsageInterval: 120 });
  assert.deepEqual(plain(api.readSeat()), seat);
  assert.equal(api.readJSON("deepseekUsageTheme", {}).name, "green");
  assert.equal(api.readRaw("deepseekUsageAutoRefresh", true), false);
  assert.equal(api.readRaw("deepseekUsageInterval", 30), 120);
});

test("editing a row keeps saved prices even when they equal the current defaults", () => {
  const fragment = source.slice(source.indexOf("  var persist ="), source.indexOf("  var commit ="));
  let saved;
  const persist = vm.runInNewContext(fragment + "\npersist;", { props: { onSave: value => { saved = plain(value); } }, fx: host.rates.usdToCny, hidden: host.rates.hidden });
  persist({ ...host.rates.models, second: rate(5) });
  assert.deepEqual(saved.models, { ...host.rates.models, second: rate(5) });
  assert.deepEqual(saved.hidden, host.rates.hidden);
});


test("restored host prices stay off query URLs even with a full saved table", () => {
  const { api } = browser();
  const models = Object.fromEntries(Array.from({ length: 500 }, (_, i) => ["model-" + i, rate(9)]));
  api.restoreRates({ ratesSaved: true, rates: { ...host.rates, models } });
  assert.equal(Object.keys(api.readRates().models).length, 500);
  assert.equal(api.ratesParam(), "");
});

test("a budget read started before an edit cannot replace confirmed newer prices", async () => {
  const { api, context } = browser();
  let resolve;
  context.getJSON = () => new Promise(yes => { resolve = yes; });
  const pending = api.getBudget();
  vm.runInContext("ratesRevision++; ratesEdited = true", context);
  api.writeJSON("deepseekUsagePricingV2", host.rates);
  vm.runInContext("ratesEdited = false", context);
  const stale = { ratesSaved: true, rates: { ...host.rates, usdToCny: 1 } };
  resolve(stale);
  api.restoreRates(await pending);
  assert.deepEqual(plain(api.readRates()), host.rates);
  api.restoreRates({ ratesSaved: true, rates: { ...host.rates, usdToCny: 8.8 } });
  assert.equal(api.readRates().usdToCny, 8.8);
});

test("saving a model equal to this release's default retains its explicit price", () => {
  const fragment = source.slice(source.indexOf("  var saveEdit ="), source.indexOf("  var remove ="));
  let saved;
  const saveEdit = vm.runInNewContext(fragment + "\nsaveEdit;", {
    buff: rate(9), nums: value => value, rows: host.rates.models, edit: "deepseek-flash", D: { "deepseek-flash": rate(9) },
    F: ["input", "output", "cacheRead", "cacheWrite"], sel: {}, commit: value => { saved = plain(value); },
    setError() {}, setSel() {}, setEdit() {}, setBuff() {},
  });
  saveEdit();
  assert.deepEqual(saved, host.rates.models);
});

test("official session logs are requested only after the session view is selected", () => {
  assert.equal(source.includes('if (!isLocal && page !== "calendar" && sessionsNeeded)'), true);
  assert.equal(source.includes('if (item[0] === "sessions" && props.onSessionsNeeded) props.onSessionsNeeded();'), true);
});


test("a save from a closed dialog cannot overwrite a newer dialog's edited prices", async () => {
  const { api, context } = browser();
  const jobs = [], accepted = [];
  context.postBudget = () => new Promise(resolve => { jobs.push(resolve); });
  context.acceptBudget = value => { api.restoreRates(value); accepted.push(value); };
  context.setRatesError = () => {};
  context.loadView = () => {};
  context.loadToday = () => {};
  const fragment = source.slice(source.indexOf("  function syncBudgetRates("), source.indexOf("  function saveFx("));
  const create = vm.runInContext("(function(ratesSyncRef,budgetRef) { " + fragment + " return syncBudgetRates; })", context);
  const first = create({ current: 0 }, { current: 0 });
  const second = create({ current: 0 }, { current: 0 });
  first(host.rates);
  const newer = { ratesSaved: true, rates: { ...host.rates, usdToCny: 9.1 } };
  api.writeJSON("deepseekUsagePricingV2", newer.rates);
  second(newer.rates);
  jobs[0](host);
  for (let i = 0; i < 4; i++) await Promise.resolve();
  assert.equal(accepted.length, 0);
  assert.equal(vm.runInContext("ratesEdited", context), true);
  assert.equal(api.readRates().usdToCny, 9.1);
  jobs[1](newer);
  for (let i = 0; i < 4; i++) await Promise.resolve();
  assert.equal(accepted.length, 1);
  assert.equal(vm.runInContext("ratesEdited", context), false);
  assert.deepEqual(plain(api.readRates()), newer.rates);
});


test("a delayed mode-only POST cannot restore prices from before a newer edit", async () => {
  const { api, context } = browser();
  let finish;
  context.BASE = "/api/deepseek-usage";
  context.fetch = async () => ({ ok: true, json: () => new Promise(resolve => { finish = resolve; }) });
  const post = vm.runInContext(source.slice(source.indexOf("function postBudget("), source.indexOf("function createSourceSync(")) + "\npostBudget;", context);
  const pending = post({ mode: "official" });
  await Promise.resolve();
  vm.runInContext("ratesRevision++", context);
  api.writeJSON("deepseekUsagePricingV2", host.rates);
  finish({ ratesSaved: true, rates: { ...host.rates, usdToCny: 1 } });
  api.restoreRates(await pending);
  assert.deepEqual(plain(api.readRates()), host.rates);
});

test("token over-limit marks the input instead of printing a bottom error", () => {
  const source = readFileSync(new URL("../src/client.js", import.meta.url), "utf8");
  const css = readFileSync(new URL("../src/panel.css", import.meta.url), "utf8");
  assert.match(source, /var tokenOver = [^;]*Number\(draft\.tokens\) > 999/, "上限判断按当前输入值实时计算");
  assert.match(source, /key === "tokens" && tokenOver\) return;/, "超限时不写入配置");
  assert.match(source, /d-fx-input" \+ \(token && tokenOver \? " d-fx-invalid"/, "超限时输入框标红");
  assert.match(source, /"aria-invalid": token && tokenOver \? true/, "红色状态同时暴露给无障碍树");
  assert.doesNotMatch(source, /rangeOverflow \? "Token 上限每种单位最多 999"/, "不再走设置底部的错误文案通道");
  assert.match(source, /tokenOver \? jsx\("small", \{ className: "d-budget-invalid", role: "alert", children: "每种单位最多 999，超出不会保存" \}\)/, "标红之外给出可读提示");
  assert.match(css, /d-fx-input\.d-fx-invalid\s*\{[^}]*var\(--d-danger\)/, "红色来自现有危险色令牌");
  assert.match(css, /d-budget-invalid\s*\{[^}]*var\(--d-danger\)/, "提示文字与边框同色系");
});
