import test from "node:test";
import assert from "node:assert/strict";
import { createAccountSource, ACCOUNT_RECORD_KEY } from "../src/account.js";
import { createCache } from "../src/cache.js";
import { apply } from "../src/index.js";
import { registerRoutes, OFFICIAL_PATH } from "../src/http.js";

const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; };

test("credential invalidation separates bills and sign-out does not reuse them", async () => {
  let token = "account-a", calls = 0;
  const account = createAccountSource({ async readRecord(key) { assert.equal(key, ACCOUNT_RECORD_KEY); return { payload: { token } }; } });
  const cache = createCache({ scope: (force) => account.cacheScope(force) });
  const bill = () => cache.getOrFetch("bill", async () => { calls++; return token ?? "signed-out"; });
  assert.equal(await bill(), "account-a");
  token = "account-b";
  account.invalidate();
  assert.equal(await bill(), "account-b");
  assert.equal(await bill(), "account-b");
  token = undefined;
  account.invalidate();
  assert.equal(await bill(), "signed-out");
  assert.equal(calls, 3);
  assert.doesNotMatch(await account.cacheScope(), /account-/);
});

test("invalidated credential reads cannot return a previous grant", async () => {
  const old = deferred();
  let reads = 0;
  const account = createAccountSource({ readRecord() { return ++reads === 1 ? old.promise : Promise.resolve({ payload: { token: "new" } }); } });
  const pending = account.getToken();
  account.invalidate();
  assert.equal(await account.getToken(), "new");
  old.resolve({ payload: { token: "old" } });
  assert.equal(await pending, "new");
  assert.equal(await account.getToken(), "new");
});

test("force refresh changes the account cache scope even before its TTL", async () => {
  let token = "first";
  const account = createAccountSource({ async readRecord() { return { payload: { token } }; } });
  const first = await account.cacheScope();
  token = "second";
  assert.notEqual(await account.cacheScope(true), first);
});

test("clear rejects an old producer and preserves the replacement flight", async () => {
  const cache = createCache(), old = deferred(), fresh = deferred();
  const previous = cache.getOrFetch("bill", () => old.promise);
  await Promise.resolve();
  cache.clear();
  const current = cache.getOrFetch("bill", () => fresh.promise);
  await Promise.resolve();
  old.resolve("old account");
  await assert.rejects(previous, { code: "cache-invalidated" });
  assert.deepEqual(cache.size(), { cached: 0, inflight: 1 });
  fresh.resolve("new account");
  assert.equal(await current, "new account");
  assert.equal(cache.get("bill"), "new account");
});

test("a failed old producer cannot remove a replacement flight", async () => {
  const cache = createCache(), old = deferred(), fresh = deferred();
  const previous = cache.getOrFetch("bill", () => old.promise);
  await Promise.resolve();
  cache.clear();
  const current = cache.getOrFetch("bill", () => fresh.promise);
  await Promise.resolve();
  old.reject(new Error("old failure"));
  await assert.rejects(previous, /old failure/);
  assert.equal(cache.size().inflight, 1);
  fresh.resolve("fresh");
  await current;
});

test("clear during account scope resolution prevents the old query from starting", async () => {
  const scope = deferred();
  let calls = 0;
  const cache = createCache({ scope: () => scope.promise });
  const pending = cache.getOrFetch("bill", () => { calls++; return "old"; });
  cache.clear();
  const rejection = assert.rejects(pending, { code: "cache-invalidated" });
  scope.resolve("old-account");
  await rejection;
  assert.equal(calls, 0);
  assert.deepEqual(cache.size(), { cached: 0, inflight: 0 });
});

test("clear before the producer microtask prevents obsolete work", async () => {
  let calls = 0;
  const cache = createCache();
  const pending = cache.getOrFetch("bill", () => { calls++; return "old"; });
  cache.clear();
  await assert.rejects(pending, { code: "cache-invalidated" });
  assert.equal(calls, 0);
});

test("an account switch before nested balance loading cannot cache the previous grant's balance", async () => {
  let token = "a", switchOnBalance = true;
  const account = createAccountSource({ async readRecord() { return { payload: { token } }; } });
  const scopedCache = createCache({ scope: (force) => account.cacheScope(force) });
  const cache = { getOrFetch(key, producer, options) {
    if (key === "official:balance" && switchOnBalance) {
      switchOnBalance = false;
      token = "b";
      account.invalidate();
      scopedCache.clear();
    }
    return scopedCache.getOrFetch(key, producer, options);
  } };
  const routes = new Map(), calls = [];
  const server = { register(route) { routes.set(route.path, route.handler); return () => {}; } };
  registerRoutes({ get: (name) => name === "webServer" ? server : undefined, effect: (fn) => fn() }, {
    account, cache, api: {
      async fetchSummary(grant) { calls.push(grant); return { total: grant === "a" ? 11 : 22 }; },
      async fetchRangeAmount() { return { bucket: 3600, rows: [] }; },
      async fetchRangeCost() { return { bucket: 3600, rows: [] }; },
    },
  });
  async function request() {
    let status, body;
    await routes.get(OFFICIAL_PATH)({ url: OFFICIAL_PATH + "?range=today&tz=28800", method: "GET", socket: { remoteAddress: "127.0.0.1" }, headers: { host: "127.0.0.1" } }, {
      writeHead(value) { status = value; }, end(value) { body = JSON.parse(value); },
    });
    return { status, body };
  }
  assert.equal((await request()).body.error, "cache-invalidated");
  const fresh = await request();
  assert.equal(fresh.status, 200);
  assert.equal(fresh.body.balance.total, 22);
  assert.deepEqual(calls, ["b"]);
});

test("plugin credential events invalidate the account immediately and ignore unrelated records", async () => {
  const events = new Map(), routes = new Map();
  let token = "signed-in", reads = 0;
  const server = { register(route) { routes.set(route.path, route.handler); return () => {}; } };
  apply({
    credentials: { async readRecord() { reads++; return { payload: { token } }; } },
    get(name) { return name === "webServer" ? server : undefined; },
    on(name, fn) { events.set(name, fn); }, effect(fn) { return fn(); },
  });
  const status = async () => {
    let result;
    await routes.get("/api/deepseek-usage/status")({ method: "GET", socket: { remoteAddress: "127.0.0.1" }, headers: { host: "127.0.0.1" } }, {
      writeHead() {}, end(body) { result = JSON.parse(body); },
    });
    return result;
  };
  try {
    assert.equal((await status()).logged, true);
    token = undefined;
    events.get("credentials/record-updated")("another/record");
    assert.equal((await status()).logged, true);
    assert.equal(reads, 1);
    events.get("credentials/record-updated")(ACCOUNT_RECORD_KEY);
    assert.equal((await status()).logged, false);
    assert.equal(reads, 2);
  } finally { events.get("dispose")(); }
});
