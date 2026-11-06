import test from "node:test";
import assert from "node:assert/strict";
import { Readable } from "node:stream";
import { createServer, request as httpRequest } from "node:http";
import { BUDGET_PATH, MAX_BUDGET_BODY_BYTES, registerRoutes } from "../src/http.js";
import { createBudget, createBudgetStore } from "../src/budget.js";

const origin = "http://127.0.0.1:62687";
const config = { mode: "local", tokens: { enabled: true, limit: 100 }, cny: { enabled: false, limit: 0 } };
function harness() {
  let writes = 0;
  const budget = createBudget({
    local: { async query() { return { totals: { tokens: 0, cost: 0 }, coverage: { complete: true }, costMeta: { complete: true } }; } },
    store: { available: () => true, async save() { writes++; } },
  });
  const routes = new Map();
  const server = { getOrigin: () => origin, register(route) { routes.set(route.path, route.handler); return () => {}; } };
  registerRoutes({ get: (name) => name === "webServer" ? server : undefined, effect(fn) { return fn(); } }, { budget });
  async function request({ method = "POST", body = JSON.stringify({ config }), headers = {}, peer = "127.0.0.1", chunks, url = BUDGET_PATH } = {}) {
    const req = Readable.from(chunks ?? [body]);
    req.method = method;
    req.url = url;
    req.socket = { remoteAddress: peer };
    req.headers = { host: "127.0.0.1:62687", origin, "content-type": "application/json", ...headers };
    let status, result;
    const res = { writeHead(value) { status = value; }, end(value) { result = JSON.parse(value); } };
    await routes.get(BUDGET_PATH)(req, res);
    return { status, body: result };
  }
  return { request, writes: () => writes };
}

test("GET reads budget and cannot save config even with write-shaped query/body", async () => {
  const h = harness();
  const result = await h.request({ method: "GET" });
  assert.equal(result.status, 200);
  assert.equal(result.body.config.tokens.enabled, false);
  assert.equal(h.writes(), 0);
});

test("light GET returns config without loading usage status", async () => {
  const h = harness();
  const result = await h.request({ method: "GET", url: BUDGET_PATH + "?light=1" });
  assert.equal(result.status, 200);
  assert.equal(result.body.status.pending, true);
  assert.equal(result.body.config.cny.limit, 0);
  assert.equal(h.writes(), 0);
});

test("POST saves config and returns current state and effective schema2 rates", async () => {
  const h = harness();
  const result = await h.request();
  assert.equal(result.status, 200);
  assert.deepEqual(result.body.config, config);
  assert.equal(result.body.rates.schema, 2);
  assert.equal(result.body.status.timezone, "Asia/Shanghai");
  assert.equal(h.writes(), 1);
});

test("rates-only POST preserves current budget and config-only preserves rates", async () => {
  const h = harness();
  await h.request();
  const rates = { schema: 2, usdToCny: 7.7, models: {} };
  const result = await h.request({ body: JSON.stringify({ rates }) });
  assert.equal(result.status, 200);
  assert.deepEqual(result.body.config, config);
  assert.equal(result.body.rates.usdToCny, 7.7);
});

test("mode-only POST switches the source without dropping limits", async () => {
  const h = harness();
  await h.request();
  const result = await h.request({ body: JSON.stringify({ mode: "official" }) });
  assert.equal(result.status, 200);
  assert.equal(result.body.config.mode, "official");
  assert.deepEqual(result.body.config.tokens, config.tokens);
  assert.deepEqual(result.body.config.cny, config.cny);
});

test("write routes accept the exact origin of the validated request host", async () => {
  const h = harness();
  const result = await h.request({ headers: { host: "127.0.0.1:53885", origin: "http://127.0.0.1:53885" } });
  assert.equal(result.status, 200);
  assert.equal(h.writes(), 1);
});

test("write routes accept another loopback hostname on the same port", async () => {
  const h = harness();
  for (const headers of [
    { host: "127.0.0.1:62687", origin: "http://localhost:62687" },
    { host: "localhost:62687", origin: "http://127.0.0.1:62687" },
    { host: "[::1]:62687", origin: "http://localhost:62687" },
  ]) {
    const result = await h.request({ headers });
    assert.equal(result.status, 200, JSON.stringify(headers));
  }
  assert.equal(h.writes(), 3);
});

test("write routes accept the Desktop shell, including its Origin-stripped proxy", async () => {
  const h = harness();
  for (const headers of [
    { origin: "dsh-app://app" },
    { origin: undefined, "sec-fetch-site": undefined, cookie: "dsh_session=test" },
  ]) {
    const result = await h.request({ headers });
    assert.equal(result.status, 200, JSON.stringify(headers));
  }
  assert.equal(h.writes(), 2);
});

test("write routes require loopback peer and host and a loopback same-port Origin", async () => {
  const h = harness();
  for (const options of [
    { peer: "192.0.2.10" }, { headers: { host: "evil.example:62687" } },
    { headers: { origin: "https://evil.example" } }, { headers: { origin: "null" } },
    { headers: { origin: undefined } }, { headers: { origin: `${origin}/` } },
    { headers: { origin: "http://127.0.0.1:1" } }, { headers: { origin: "http://localhost:1" } },
    { headers: { origin: "https://127.0.0.1:62687" } }, { headers: { "sec-fetch-site": "cross-site" } },
    { headers: { origin: undefined, cookie: "dsh_session=test", "sec-fetch-site": "cross-site" } },
    { headers: { origin: "dsh-app://evil" } }, { headers: { origin: "null" } },
    { headers: { host: "127.0.0.1:53885", origin: "http://127.0.0.1:62687/" } },
  ]) assert.equal((await h.request(options)).status, 403);
  assert.equal(h.writes(), 0);
});

test("write routes require JSON and bounded bodies, including chunked bodies", async () => {
  const h = harness();
  for (const headers of [{ "content-type": "text/plain" }, { "content-type": undefined }, { "content-type": "application/jsonp" }]) {
    assert.equal((await h.request({ headers })).status, 415);
  }
  assert.equal((await h.request({ headers: { "content-length": `${MAX_BUDGET_BODY_BYTES + 1}` } })).status, 413);
  assert.equal((await h.request({ headers: { "content-length": "invalid" } })).status, 400);
  assert.equal((await h.request({ chunks: [" ".repeat(100_000), " ".repeat(100_001)] })).status, 413);
  assert.equal((await h.request({ method: "PUT" })).status, 405);
  assert.equal(h.writes(), 0);
});

test("POST responds across Loader-style disposal and re-registration, and rejects chunked overflow", async (t) => {
  const routes = new Map();
  let disposers = [], raw = {}, serverOrigin;
  const entry = { options: { name: "deepseek-usage" } };
  const local = { async query() { return { totals: { tokens: 0, cost: 0 }, coverage: { complete: true }, costMeta: { complete: true } }; } };
  const carrier = { getOrigin: () => serverOrigin, register(route) { routes.set(route.path, route.handler); return () => routes.delete(route.path); } };
  const editor = { entries: () => [entry], async edit(target, change) {
    assert.equal(target, entry);
    raw = change(raw);
    for (const dispose of disposers) dispose();
    disposers = [];
    mount();
  } };
  function mount() {
    const ctx = { fiber: { entry }, get(name) { return name === "webServer" ? carrier : name === "configEditor" ? editor : undefined; }, effect(fn) { const dispose = fn(); disposers.push(dispose); } };
    const budget = createBudget({ local, initial: raw.budget, store: createBudgetStore(ctx) });
    registerRoutes(ctx, { budget });
  }
  mount();
  const server = createServer((req, res) => routes.get(req.url)(req, res));
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  serverOrigin = `http://127.0.0.1:${server.address().port}`;
  function call(method, chunks = []) {
    return new Promise((resolve, reject) => {
      const req = httpRequest(`${serverOrigin}${BUDGET_PATH}`, { method, headers: { origin: serverOrigin, "content-type": "application/json" } }, (res) => {
        const buffers = [];
        res.on("data", (chunk) => buffers.push(chunk));
        res.on("end", () => resolve({ status: res.statusCode, body: JSON.parse(Buffer.concat(buffers).toString()) }));
      });
      req.on("error", reject);
      for (const chunk of chunks) req.write(chunk);
      req.end();
    });
  }
  const result = await call("POST", [JSON.stringify({ config })]);
  assert.equal(result.status, 200);
  assert.deepEqual(result.body.config, config);
  assert.deepEqual(raw.budget.tokens, config.tokens);
  const afterReload = await call("GET");
  assert.equal(afterReload.status, 200);
  assert.deepEqual(afterReload.body.config, config);
  assert.equal(afterReload.body.status.storageAvailable, true);
  const oversized = await call("POST", [" ".repeat(100_000), " ".repeat(100_001)]);
  assert.equal(oversized.status, 413);
  assert.equal(oversized.body.error, "body-too-large");
});

test("invalid JSON/config/rates and unexpected keys are rejected without persistence", async () => {
  const h = harness();
  for (const body of ["{", "null", "[]", "{}", JSON.stringify({ config: null }), JSON.stringify({ config: {} }),
    JSON.stringify({ config, extra: true }), JSON.stringify({ rates: null }), JSON.stringify({ rates: { schema: 1 } }),
    JSON.stringify({ config: { ...config, tokens: { enabled: true, limit: -1 } } }),
    JSON.stringify({ rates: { schema: 2, usdToCny: 7, models: { bad: { input: "1", output: 1, cacheRead: 1, cacheWrite: 1 } } } }),
  ]) assert.equal((await h.request({ body })).status, 400, body);
  assert.equal(h.writes(), 0);
});
