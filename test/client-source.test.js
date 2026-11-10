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
