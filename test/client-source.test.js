import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const source = readFileSync(new URL("../src/client.js", import.meta.url), "utf8");
const createSourceSync = vm.runInNewContext(source.slice(source.indexOf("function createSourceSync("), source.indexOf("function budgetLabel(")) + "\ncreateSourceSync;");
const value = (mode) => ({ config: { mode } });
function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
function harness(read = async () => value("official")) {
  const writes = [], accepted = [], failures = [];
  const sync = createSourceSync(read, (body) => {
    const job = deferred();
    writes.push({ mode: body.mode, ...job });
    return job.promise;
  }, (result) => accepted.push(result.config.mode), () => failures.push("failed"));
  return { sync, writes, accepted, failures };
}
const tick = async () => { for (let i = 0; i < 8; i++) await Promise.resolve(); };

test("opening adopts the host mode without POST; selection commits only after persistence", async () => {
  const h = harness(async () => value("local"));
  await h.sync.load();
  assert.deepEqual(h.accepted, ["local"]);
  assert.equal(h.writes.length, 0);
  const saving = h.sync.select("official");
  await tick();
  assert.deepEqual(h.accepted, ["local"]);
  assert.equal(h.writes[0].mode, "official");
  h.writes[0].resolve(value("official"));
  await saving;
  assert.deepEqual(h.accepted, ["local", "official"]);
});

test("a late opening response cannot overwrite a user's saved selection", async () => {
  const initial = deferred(), h = harness(() => initial.promise);
  const loading = h.sync.load();
  const saving = h.sync.select("local");
  await tick();
  h.writes[0].resolve(value("local"));
  await saving;
  initial.resolve(value("official"));
  await loading;
  assert.deepEqual(h.accepted, ["local"]);
});

test("rapid switches serialize writes and only the latest result reaches the UI", async () => {
  const h = harness();
  await h.sync.load();
  const first = h.sync.select("local"), last = h.sync.select("official");
  await tick();
  assert.equal(h.writes.length, 1);
  h.writes[0].resolve(value("local"));
  await first;
  await tick();
  assert.deepEqual(h.accepted, ["official"]);
  assert.equal(h.writes[1].mode, "official");
  h.writes[1].resolve(value("official"));
  await last;
  assert.deepEqual(h.accepted, ["official", "official"]);
});

test("a failed latest switch reports failure and shows the last persisted mode", async () => {
  const h = harness();
  await h.sync.load();
  const first = h.sync.select("local"), last = h.sync.select("official");
  await tick();
  h.writes[0].resolve(value("local"));
  await first;
  await tick();
  h.writes[1].reject(new Error("storage unavailable"));
  await last;
  assert.deepEqual(h.accepted, ["official", "local"]);
  assert.equal(h.failures.length, 1);
});

test("closing cancels queued source writes while the admitted write can finish", async () => {
  const h = harness();
  await h.sync.load();
  const first = h.sync.select("local"), queued = h.sync.select("official");
  await tick();
  assert.equal(h.writes.length, 1);
  h.sync.close();
  h.writes[0].resolve(value("local"));
  await first;
  await tick();
  assert.equal(h.writes.length, 1);
  await queued;
  assert.deepEqual(h.accepted, ["official"]);
  await h.sync.load();
  assert.deepEqual(h.accepted, ["official", "official"]);
});

test("failed initial reads report failure without POST; closing ignores late responses", async () => {
  const h = harness(async () => { throw new Error("offline"); });
  await h.sync.load();
  assert.equal(h.failures.length, 1);
  assert.equal(h.writes.length, 0);
  assert.deepEqual(h.accepted, []);
  const initial = deferred(), closing = harness(() => initial.promise);
  const loading = closing.sync.load();
  closing.sync.close();
  initial.resolve(value("local"));
  await loading;
  assert.deepEqual(closing.accepted, []);
});


test("source selection shows feedback immediately, prevents duplicate clicks and clears it after saving", async () => {
  const job = deferred();
  const switches = [], menus = [], writes = [];
  const context = vm.createContext({
    mode: "official", switching: false, budgetRef: { current: 0 },
    setOpen: value => menus.push(value),
    setSwitching(value) { context.switching = value; switches.push(value); },
    sourceRef: { current: { select(mode) { writes.push(mode); return job.promise; } } },
  });
  const start = source.indexOf("  function selectSource(next)");
  vm.runInContext(source.slice(start, source.indexOf("  useEffect(", start)), context);
  context.selectSource("local");
  assert.deepEqual(switches, [true], "show loading before persistence resolves");
  assert.deepEqual(writes, ["local"]);
  context.selectSource("official");
  assert.equal(writes.length, 1, "ignore repeat input while switching");
  job.resolve(value("local"));
  await tick();
  assert.deepEqual(switches, [true, false]);
  assert.equal(context.budgetRef.current, 1);
  context.selectSource("official");
  assert.equal(writes.length, 1, "selecting the active source performs no save");
});

test("a rejected switch clears loading so the user can retry", async () => {
  const h = harness();
  await h.sync.load();
  const switches = [];
  const context = vm.createContext({ mode: "official", switching: false, budgetRef: { current: 0 },
    setOpen() {}, setSwitching(value) { context.switching = value; switches.push(value); }, sourceRef: { current: h.sync } });
  const start = source.indexOf("  function selectSource(next)");
  vm.runInContext(source.slice(start, source.indexOf("  useEffect(", start)), context);
  context.selectSource("local");
  await tick();
  h.writes[0].reject(new Error("disk full"));
  await tick();
  assert.deepEqual(switches, [true, false]);
  assert.deepEqual(h.accepted, ["official", "official"]);
  assert.equal(h.failures.length, 1);
});


test("light budget acceptance makes the panel ready before the enabled guard status completes", () => {
  const start = source.indexOf("  function acceptBudget(value)");
  const fragment = source.slice(start, source.indexOf("  function loadBudget()", start));
  const ready = [], accepted = [], loads = [];
  const context = vm.createContext({
    budgetRef: { current: 0 }, restoreRates() {}, readRates: () => ({ usdToCny: 7 }),
    DEFAULT_FX: 6.7, setFx() {}, readyS: [false, value => ready.push(value)],
    setBudgetInfo: value => accepted.push(value), notifySource() {}, loadBudget: () => loads.push("load"),
  });
  vm.runInContext(fragment, context);
  const pending = { config: { mode: "local" }, status: { pending: true, enabled: true } };
  context.acceptBudget(pending);
  assert.deepEqual(ready, [true]);
  assert.equal(accepted[0], pending);
  assert.deepEqual(loads, ["load"]);
  context.acceptBudget({ ...pending, status: { pending: false, enabled: true } });
  assert.equal(loads.length, 1, "a completed status must not start an endless read loop");
  context.acceptBudget({ ...pending, status: { pending: true, enabled: false } });
  assert.equal(loads.length, 1, "disabled limits need no additional scan");
});
