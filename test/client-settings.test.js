import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFileSync } from "node:fs";

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

test("automatic refresh resumes when host pricing becomes ready", () => {
  const start = source.lastIndexOf("  useEffect(function () {", source.indexOf("    if (!auto) return;"));
  const effect = source.slice(start, source.indexOf("  function loadView(force)", start));
  let previous, cleanup, scheduled, calls = 0;
  const render = ready => vm.runInNewContext("(function(ready) { " + effect + " })(ready);", {
    ready, auto: true, interval: 30, range: "today", custom: null, anchor: { year: 2026, month: 11 }, page: "detail", dim: "day", mode: "local",
    loadView: () => { calls++; }, loadToday() {},
    window: { setInterval: callback => { scheduled = callback; return 1; } }, clearInterval() {},
    useEffect: (callback, deps) => {
      if (!previous || deps.some((value, i) => value !== previous[i])) { cleanup?.(); cleanup = callback(); previous = deps; }
    },
  });
  render(false);
  const first = scheduled;
  render(true);
  assert.notEqual(scheduled, first, "readiness change must replace the captured timer callback");
  scheduled();
  assert.equal(calls, 1);
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
