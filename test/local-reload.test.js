import test from "node:test";
import assert from "node:assert/strict";
import { Readable } from "node:stream";
import { symbols } from "@deepseek-ai/cordis";
import { apply } from "../src/index.js";

function logs() {
  const entries = new Map([[
    "first", { revision: 1, tokens: 10 },
  ], ["second", { revision: 1, tokens: 20 }]]);
  const reads = [], listings = [];
  const persistence = {
    async list() {
      listings.push(true);
      return [...entries].map(([id, row]) => ({ header: { id }, revision: row.revision }));
    },
    async open(id) {
      reads.push(id);
      const row = entries.get(id);
      return { close() {}, async read() { return { events: [{ type: "assistant/message", seq: 1,
        time: Date.parse("2026-11-16T01:00:00Z"), data: { turn: 0, step: 0,
          message: { source: { provider: "custom", model: "priced" } }, usage: { inputTokens: row.tokens } } }] }; } };
    },
  };
  return { persistence, entries, reads, listings };
}
function host(persistence) {
  const routes = new Map();
  const serviceView = () => new Proxy(persistence, { get(target, key, receiver) {
    return key === symbols.original ? target : Reflect.get(target, key, receiver);
  } });
  const entry = { options: { name: "deepseek-usage" } };
  let config = {}, cleanup = [];
  const origin = "http://127.0.0.1:54321";
  const server = { getOrigin: () => origin, register(route) { routes.set(route.path, route.handler); return () => routes.delete(route.path); } };
  const editor = { entries: () => [entry], async edit(_, change) {
    config = change(config);
    dispose();
    mount();
  } };
  function dispose() { for (const fn of cleanup) fn(); cleanup = []; }
  function mount() {
    const persistenceView = serviceView();
    apply({ credentials: { async readRecord() {} }, fiber: { entry },
      get(name) { return { webServer: server, configEditor: editor, sessionPersistence: persistenceView }[name]; },
      on(name, handler) { if (name === "dispose") cleanup.push(handler); },
      effect(fn) { cleanup.push(fn()); },
    }, config);
  }
  mount();
  async function request(path, body) {
    const req = Readable.from(body ? [JSON.stringify(body)] : []);
    Object.assign(req, { method: body ? "POST" : "GET", url: path, socket: { remoteAddress: "127.0.0.1" },
      headers: { host: "127.0.0.1:54321", origin, "content-type": "application/json" } });
    let status, result;
    await routes.get(path.split("?")[0])(req, { writeHead(value) { status = value; }, end(value) { result = JSON.parse(value); } });
    assert.equal(status, 200, JSON.stringify(result));
    return result;
  }
  return { request, dispose, async reconfigure(local) { config = { ...config, local }; dispose(); mount(); } };
}
const localPath = "/api/deepseek-usage/local?from=2026-11-16&to=2026-11-16&tz=28800";
const budgetPath = "/api/deepseek-usage/budget";

test("real plugin disposal/reapply during source saves preserves folded logs and revalidates revisions", async t => {
  const log = logs(), h = host(log.persistence);
  t.after(h.dispose);
  assert.equal((await h.request(localPath)).totals.tokens, 30);
  assert.deepEqual(log.reads, ["first", "second"]);
  for (let i = 0; i < 3; i++) {
    await h.request(budgetPath, { mode: "official" });
    const saved = await h.request(budgetPath, { mode: "local" });
    assert.equal(saved.status.pending, true);
    assert.equal((await h.request(localPath)).totals.tokens, 30);
  }
  assert.deepEqual(log.reads, ["first", "second"], "repeated switches must not reread unchanged historical logs");
  assert.equal(log.listings.length, 4, "each reload still checks revisions/deletions");
  log.entries.set("first", { revision: 2, tokens: 40 });
  log.entries.delete("second");
  log.entries.set("new", { revision: 1, tokens: 7 });
  await h.request(budgetPath, { mode: "official" });
  await h.request(budgetPath, { mode: "local" });
  const updated = await h.request(localPath);
  assert.equal(updated.totals.tokens, 47);
  assert.deepEqual(log.reads, ["first", "second", "first", "new"]);
  assert.equal(updated.sessions.some(row => row.sessionId === "second"), false);
});

test("folded caches stay isolated by persistence service and scan limit, while pricing is recalculated", async t => {
  const first = logs(), second = logs();
  second.entries.get("first").tokens = 100;
  const a = host(first.persistence), b = host(second.persistence);
  t.after(a.dispose); t.after(b.dispose);
  assert.equal((await a.request(localPath)).totals.tokens, 30);
  assert.equal((await b.request(localPath)).totals.tokens, 120);
  const prices = input => ({ schema: 2, usdToCny: 7, models: { priced: { input, output: 0, cacheRead: 0, cacheWrite: 0 } }, hidden: [] });
  await a.request(budgetPath, { rates: prices(1) });
  assert.equal((await a.request(localPath)).totals.cost, 30 * 7 / 1e6);
  await a.request(budgetPath, { rates: prices(2) });
  assert.equal((await a.request(localPath)).totals.cost, 60 * 7 / 1e6);
  assert.deepEqual(first.reads, ["first", "second"], "price edits reuse tokens, never old amounts");
  await a.reconfigure({ maxSessions: 1 });
  const truncated = await a.request(localPath);
  assert.equal(truncated.coverage.truncated, true);
  assert.equal(truncated.coverage.sessions, 1);
  assert.equal(first.reads.length, 3, "changing the scan limit starts a separate cache");
});

test("a reload during a scan waits then rechecks revisions without concurrent scans", async t => {
  const log = logs();
  let resume, entered;
  const paused = new Promise(resolve => { entered = resolve; });
  const gate = new Promise(resolve => { resume = resolve; });
  const open = log.persistence.open;
  let once = true;
  log.persistence.open = async id => {
    const reader = await open(id);
    if (once) {
      once = false;
      const read = reader.read;
      reader.read = async () => { entered(); await gate; return read(); };
    }
    return reader;
  };
  const h = host(log.persistence);
  t.after(h.dispose);
  const old = h.request(localPath);
  await paused;
  log.entries.set("new", { revision: 1, tokens: 7 });
  await h.request(budgetPath, { mode: "local" });
  const fresh = h.request(localPath);
  resume();
  await old;
  assert.equal((await fresh).totals.tokens, 37);
  assert.equal(log.listings.length, 2);
  assert.deepEqual(log.reads, ["first", "second", "new"]);
});
