/**
 * /local 与 /reconcile 的回环路由契约。
 *
 * 不启动 DSH：用最小 ctx + 内存 sessionPersistence 跑真实 handler。
 */

import test from "node:test";
import assert from "node:assert/strict";

import { apply, BASE_PATH } from "../src/index.js";
import { LOCAL_PATH, RECONCILE_PATH, localQuery, localWindow, parseRates } from "../src/http.js";

const TZ = 28_800; // GMT+8
const NOW = Date.now();
const DAY = new Date(NOW + TZ * 1000).toISOString().slice(0, 10);
const TIME = Date.parse(`${DAY}T04:00:00Z`); // 本地 12:00

function usageEvents() {
  return [
    {
      type: "request/header",
      seq: 1,
      time: TIME,
      data: { header: { config: { provider: "deepseek-official", model: "deepseek-flash" } } },
    },
    {
      type: "assistant/message",
      seq: 2,
      time: TIME,
      data: {
        turn: 1,
        step: 1,
        usage: { inputTokens: 100, cacheReadTokens: 900, outputTokens: 50 },
        message: { source: { provider: "deepseek-official", model: "deepseek-flash" } },
      },
    },
  ];
}

function makeHost({ persistence } = {}) {
  const routes = new Map();
  const credentials = {
    async readRecord() { return undefined; },
    async modifyRecord() { return undefined; },
    async deleteRecord() {},
    async describeRecord() { return { configured: false, writable: true }; },
    async listRecords() { return []; },
  };
  const webServer = {
    register(route) {
      routes.set(route.path, route);
      return () => routes.delete(route.path);
    },
  };
  const services = { webServer, ...(persistence === undefined ? {} : { sessionPersistence: persistence }) };
  const ctx = {
    logger: { info() {}, warn() {}, error() {}, debug() {} },
    credentials,
    effect(fn) { return fn(); },
    on() {},
    get(name) { return services[name]; },
    inject(names, callback) {
      callback({ [names[0]]: webServer, webServer });
    },
  };
  apply(ctx, {});
  return { routes };
}

function call(route) {
  return new Promise((resolve) => {
    const req = {
      method: "GET",
      url: route.path,
      headers: { host: "127.0.0.1:60092" },
      socket: { remoteAddress: "127.0.0.1" },
      on() {},
      destroy() {},
    };
    const res = {
      statusCode: 0,
      writeHead(status) { this.statusCode = status; return this; },
      end(body) { resolve({ status: this.statusCode, body: body === undefined ? "" : String(body) }); },
    };
    Promise.resolve(route.handler(req, res)).catch((error) => resolve({ status: 0, body: String(error) }));
  });
}

function get(routes, path, query) {
  const route = routes.get(path);
  assert.ok(route, `missing route ${path}`);
  const original = route.handler;
  return call({
    path,
    handler: (req, res) => original({ ...req, url: `${path}?${query}` }, res),
  }).then((out) => ({ ...out, json: out.body ? JSON.parse(out.body) : null }));
}

test("localQuery 解析预设、自定义范围、scope 和 tz", () => {
  const a = localQuery(`${LOCAL_PATH}?range=last7&scope=all&tz=28800`);
  assert.equal(a.range, "last7");
  assert.equal(a.scope, "all");
  assert.equal(a.tz, 28_800);

  const b = localQuery(`${LOCAL_PATH}?from=2026-10-01&to=2026-10-03`);
  assert.equal(b.range, "custom");
  assert.equal(b.from, "2026-10-01");
  assert.equal(b.to, "2026-10-03");
  assert.equal(b.scope, "all");

  assert.equal(localQuery(`${LOCAL_PATH}?from=nope&to=2026-10-03`).range, "today");
  const rates = parseRates(JSON.stringify({
    "gpt-6.1-sol": {
      peak: { hit: 1, miss: 10, cacheWrite: 0, output: 20 },
      offpeak: { hit: 0.5, miss: 5, cacheWrite: 0, output: 10 },
    },
  }));
  assert.equal(rates["gpt-6.1-sol"].peak.miss, 10);
  assert.equal(parseRates("not-json"), null);
  assert.equal(parseRates(JSON.stringify({ x: { peak: { hit: -1 } } })), null);
});

test("localWindow：今天按小时，自定义范围按天", () => {
  const today = localWindow(
    { range: "today", from: null, to: null, tz: TZ },
    Date.UTC(2026, 9, 1, 4)
  );
  assert.deepEqual(today, { from: "2026-10-01", to: "2026-10-01", granularity: "hour" });

  const custom = localWindow(
    { range: "custom", from: "2026-10-01", to: "2026-10-03", tz: TZ },
    Date.UTC(2026, 9, 1, 4)
  );
  assert.deepEqual(custom, { from: "2026-10-01", to: "2026-10-03", granularity: "day" });
});

test("/local 返回本地折叠结果，并带 coverage", async () => {
  const { routes } = makeHost({
    persistence: {
      async listSnapshots() { return [{ header: { id: "s1", createdAt: NOW }, revision: "1" }]; },
      async readFrom() { return { events: usageEvents() }; },
    },
  });

  const out = await get(routes, LOCAL_PATH, `from=${DAY}&to=${DAY}&tz=${TZ}&scope=deepseek`);
  assert.equal(out.status, 200);
  assert.equal(out.json.ok, true);
  assert.equal(out.json.source, "local");
  assert.equal(out.json.tokens.total, 1050);
  assert.equal(out.json.tokens.hit, 900);
  assert.equal(out.json.requests, 1);
  assert.equal(out.json.points.length, 1);
  assert.equal(out.json.points[0].models[0].model, "deepseek-flash");
  assert.equal(out.json.coverage.sessionsWithUsage, 1);
  assert.equal(out.json.cost, 0);
  assert.equal(out.json.costMeta.currency, "CNY");
  assert.equal(out.json.costMeta.complete, true);
  assert.equal(out.json.costMeta.pricedTokens, 1050);
  assert.equal(out.json.points[0].pricedTokens, 1050);
});

test("/local 接受自定义费率并重算 gpt 费用", async () => {
  const { routes } = makeHost({
    persistence: {
      async listSnapshots() { return [{ header: { id: "s1", createdAt: NOW }, revision: "1" }]; },
      async readFrom() {
        return {
          events: [{
            type: "assistant/message",
            seq: 1,
            time: Date.UTC(2026, 8, 29, 2),
            data: {
              turn: 1,
              step: 1,
              usage: { inputTokens: 1_000_000, cacheReadTokens: 0, outputTokens: 1_000_000 },
              message: { source: { provider: "openai", model: "gpt-6.1-sol" } },
            },
          }],
        };
      },
    },
  });
  const rates = {
    "gpt-6.1-sol": {
      peak: { hit: 1, miss: 10, cacheWrite: 0, output: 20 },
      offpeak: { hit: 0.5, miss: 5, cacheWrite: 0, output: 10 },
    },
  };
  const out = await get(routes, LOCAL_PATH, `from=2026-09-29&to=2026-09-29&tz=${TZ}&scope=all&rates=${encodeURIComponent(JSON.stringify(rates))}`);
  assert.equal(out.status, 200);
  assert.equal(out.json.models[0].model, "gpt-6.1-sol");
  assert.equal(out.json.cost, 30);
  assert.equal(out.json.costMeta.source, "自定义费率");
  assert.equal(out.json.costMeta.complete, true);
});

test("/local 在宿主没有 sessionPersistence 时返回 503", async () => {
  const { routes } = makeHost();
  const out = await get(routes, LOCAL_PATH, `from=${DAY}&to=${DAY}&tz=${TZ}`);
  assert.equal(out.status, 503);
  assert.equal(out.json.error, "local-unavailable");
});

test("/status 报告本地能力；没有 persistence 时为 false", async () => {
  const withPersistence = makeHost({
    persistence: {
      async listSnapshots() { return []; },
      async readFrom() { return { events: [] }; },
    },
  });
  const a = await get(withPersistence.routes, `${BASE_PATH}/status`, "");
  assert.equal(a.json.local.available, true);

  const without = makeHost();
  const b = await get(without.routes, `${BASE_PATH}/status`, "");
  assert.equal(b.json.local.available, false);
});

test("/reconcile 在官方未登录时降级为本地，而不是整体 500", async () => {
  const { routes } = makeHost({
    persistence: {
      async listSnapshots() { return [{ header: { id: "s1", createdAt: NOW }, revision: "1" }]; },
      async readFrom() { return { events: usageEvents() }; },
    },
  });

  const out = await get(routes, RECONCILE_PATH, `from=${DAY}&to=${DAY}&tz=${TZ}&scope=deepseek`);
  assert.equal(out.status, 200);
  assert.equal(out.json.ok, true);
  assert.equal(out.json.official.available, false);
  assert.equal(out.json.official.error, "unauthenticated");
  assert.equal(out.json.local.available, true);
  assert.equal(out.json.local.tokens, 1050);
  assert.equal(out.json.coverage, null);
  assert.equal(out.json.delta.tokens, -1050);
});
