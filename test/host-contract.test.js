/**
 * 宿主契约测试 —— 不启动 DSH，用 0.2.1 宿主的接口形状搭一个最小 ctx，
 * 断言插件能在里面 apply 起来、挂出只读端点、并且**不需要登录**就能从
 * 宿主已登录的 DeepSeek 账号记录里取到会话。
 *
 * 真实宿主里插件挂不上时几乎不给原因（web boot 只报 "deepseek-usage: failed"），
 * 所以这层离线契约测试是重启宿主前唯一的信号来源。
 */

import test from "node:test";
import assert from "node:assert/strict";

import { apply, inject as pluginInject, name as pluginName, BASE_PATH } from "../src/index.js";
import { ACCOUNT_RECORD_KEY } from "../src/account.js";

/** 0.2.1 宿主的 credentials 服务（record 面）。 */
function makeCredentials(initial = {}) {
  const records = new Map(Object.entries(initial));
  return {
    records,
    service: {
      async readRecord(key) {
        return records.get(key);
      },
      async modifyRecord(key, mutate) {
        const next = await mutate(records.get(key));
        if (next !== undefined) {
          records.set(key, next);
          return next;
        }
        return records.get(key);
      },
      async deleteRecord(key) {
        records.delete(key);
      },
      async describeRecord(key) {
        return { configured: records.has(key), writable: true };
      },
      async listRecords() {
        return [...records.entries()].map(([key, record]) => ({ key, kind: record.kind }));
      },
    },
  };
}

/** 最小宿主 ctx：够 index.js + http.js 用。 */
function makeHost(initialRecords) {
  const routes = new Map();
  const { service, records } = makeCredentials(initialRecords);
  const webServer = {
    register(route) {
      routes.set(route.path, route);
      return () => routes.delete(route.path);
    },
  };
  const ctx = {
    logger: { info() {}, warn() {}, error() {}, debug() {} },
    credentials: service,
    effect(fn) {
      return fn();
    },
    on() {},
    get(name) {
      return name === "webServer" ? webServer : undefined;
    },
    inject(names, callback) {
      const picked = names[0];
      const scoped = { [picked]: webServer, webServer };
      callback(scoped);
    },
  };
  return { ctx, routes, records };
}

/** 造一个请求/响应对，跑一次 handler。 */
function callRoute(route, { method = "GET", url = `${BASE_PATH}/status`, host = "127.0.0.1:60092" } = {}) {
  return new Promise((resolve) => {
    const req = {
      method,
      url,
      headers: { host },
      socket: { remoteAddress: "127.0.0.1" },
      on() {},
      destroy() {},
    };
    const res = {
      statusCode: 0,
      writeHead(status) {
        this.statusCode = status;
        return this;
      },
      end(body) {
        resolve({ status: this.statusCode, body: body === undefined ? "" : String(body) });
      },
    };
    Promise.resolve(route.handler(req, res)).catch((error) => resolve({ status: 0, body: String(error) }));
  });
}

/** 已登录的宿主：平台 grant 记录。 */
const GRANT = {
  kind: "grant",
  payload: { version: 1, token: "tok_host", issuer: "https://platform.deepseek.com" },
};

test("插件声明与宿主入口形状一致", () => {
  assert.equal(pluginName, "deepseek-usage");
  assert.deepEqual(pluginInject, ["credentials"]);
});

test("apply() 只挂只读端点，不再有 login/logout", () => {
  const { ctx, routes } = makeHost();
  apply(ctx, {});

  for (const path of ["status", "summary", "official", "local", "reconcile"]) {
    assert.ok(routes.has(`${BASE_PATH}/${path}`), `missing route ${path}`);
    assert.equal(routes.get(`${BASE_PATH}/${path}`).kind, "exact");
  }
  assert.equal(routes.has(`${BASE_PATH}/login`), false, "登录端点必须已移除");
  assert.equal(routes.has(`${BASE_PATH}/logout`), false);
  assert.ok(routes.has(`${BASE_PATH}/panel.css`), "面板样式表由服务端下发");
  assert.equal(routes.size, 6);
});

test("未登录时 /status 返回 logged:false 而不是抛错", async () => {
  const { ctx, routes } = makeHost();
  apply(ctx, {});

  const out = await callRoute(routes.get(`${BASE_PATH}/status`));
  assert.equal(out.status, 200);
  const payload = JSON.parse(out.body);
  assert.equal(payload.ok, true);
  assert.equal(payload.logged, false);
  assert.equal("userToken" in payload, false, "status must never carry the token");
  assert.equal("token" in payload, false);
});

test("宿主已登录时 /status 返回 logged:true", async () => {
  const { ctx, routes } = makeHost({ [ACCOUNT_RECORD_KEY]: GRANT });
  apply(ctx, {});

  const payload = JSON.parse((await callRoute(routes.get(`${BASE_PATH}/status`))).body);
  assert.equal(payload.logged, true);
  assert.equal(payload.source, ACCOUNT_RECORD_KEY);
});

test("未登录时 /summary 返回 401 unauthenticated", async () => {
  const { ctx, routes } = makeHost();
  apply(ctx, {});

  const out = await callRoute(routes.get(`${BASE_PATH}/summary`));
  assert.equal(out.status, 401);
  assert.equal(JSON.parse(out.body).error, "unauthenticated");
});

test("已登录时 /summary 用宿主 grant 打上游并聚合", async () => {
  const startSec = (url) => Number(new URL(url).searchParams.get("start"));
  const isHourly = (url) => {
    const q = new URL(url).searchParams;
    return Number(q.get("end")) - Number(q.get("start")) < 86_400;
  };
  const { ctx, routes } = makeHost({ [ACCOUNT_RECORD_KEY]: GRANT });

  const calls = [];
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (url, init) => {
    calls.push({ url: String(url), headers: init.headers });
    const u = String(url);
    if (/by_api_key\/(amount|cost)/.test(u)) {
      const q = new URL(u).searchParams;
      const st = Number(q.get("start") ?? 0);
      const dayStart = Math.floor(new Date().setHours(0, 0, 0, 0) / 1000);
      if (st >= dayStart) {
        return { ok: true, status: 200, json: async () => ({ code: 0, data: { biz_data: { models: [], series: [], days: [] } } }), text: async () => "" };
      }
    }
    const body = u.includes("get_user_summary")
      ? {
          code: 0,
          data: {
            biz_data: {
              normal_wallets: [{ currency: "CNY", balance: "100" }],
              bonus_wallets: [{ currency: "CNY", balance: "5" }],
              total_costs: [{ currency: "CNY", amount: "42" }],
            },
          },
        }
      : u.includes("by_api_key/cost")
        ? isHourly(u)
          ? { code: 0, data: { biz_data: { start: 0, end: 0, bucket: 3600, data: [] } } }
          : {
            code: 0,
            data: {
              biz_data: {
                start: 0,
                end: 0,
                bucket: 86400,
                data: [
                  {
                    currency: "CNY",
                    series: [
                      { api_key: { tracking_id: "t" }, model: "m", buckets: [{ time: startSec(u), cost: "3" }] },
                    ],
                  },
                ],
              },
            },
          }
        : u.includes("by_api_key/amount")
          ? isHourly(u)
            ? { code: 0, data: { biz_data: { start: 0, end: 0, bucket: 3600, models: [], series: [] } } }
            : {
              code: 0,
              data: {
                biz_data: {
                  start: 0,
                  end: 0,
                  bucket: 86400,
                  models: ["m"],
                  series: [
                    {
                      api_key: { tracking_id: "t" },
                      model: "m",
                      buckets: [
                        {
                          time: startSec(u),
                          usage: {
                            PROMPT_CACHE_HIT_TOKEN: "1000",
                            PROMPT_CACHE_MISS_TOKEN: "500",
                            RESPONSE_TOKEN: "250",
                            REQUEST: "9",
                          },
                        },
                      ],
                    },
                  ],
                },
              },
            }
          : {
              code: 0,
              data: {
                biz_data: {
                  days: [
                    {
                      date: "2026-10-01",
                      data: [
                        {
                          model: "m",
                          usage: [
                            { type: "PROMPT_CACHE_HIT_TOKEN", amount: "1000" },
                            { type: "PROMPT_CACHE_MISS_TOKEN", amount: "500" },
                            { type: "RESPONSE_TOKEN", amount: "250" },
                            { type: "REQUEST", amount: "9" },
                          ],
                        },
                      ],
                    },
                  ],
                },
              },
            };
    return { ok: true, status: 200, json: async () => body, text: async () => "" };
  };

  try {
    apply(ctx, {});
    const out = await callRoute(routes.get(`${BASE_PATH}/summary`), {
      url: `${BASE_PATH}/summary?year=2026&month=10`,
    });
    assert.equal(out.status, 200);

    const body = JSON.parse(out.body);
    assert.equal(body.ok, true);
    assert.equal(body.balance.total, 105);
    assert.equal(body.balance.granted, 5);
    assert.equal(body.balance.consumedTotal, 42);
    assert.equal(body.days.length, 1);
    assert.equal(body.days[0].hit, 1000);
    assert.equal(body.days[0].cost, 3);
    assert.equal(body.month.tokens, 1750);

    // 上游必须带宿主 grant，且不出现 Bearer
    assert.equal(calls.length, 5);
    assert.ok(calls.some((c) => c.url.includes("by_api_key/amount")));
    assert.ok(calls.some((c) => c.url.includes("by_api_key/cost")));
    assert.ok(calls.every((c) => !c.url.includes("usage/amount?")));
    for (const call of calls) {
      assert.equal(call.headers["x-dsh-auth-token"], "tok_host");
      assert.equal(call.headers.authorization, undefined);
    }
  } finally {
    globalThis.fetch = realFetch;
  }
});

test("非回环调用被拒（403）", async () => {
  const { ctx, routes } = makeHost();
  apply(ctx, {});

  const out = await callRoute(routes.get(`${BASE_PATH}/status`), { host: "evil.example.com" });
  assert.equal(out.status, 403);
});

test("非 GET 一律 405（端点只读）", async () => {
  const { ctx, routes } = makeHost();
  apply(ctx, {});
  const out = await callRoute(routes.get(`${BASE_PATH}/status`), { method: "POST" });
  assert.equal(out.status, 405);
});

test("未来月份被拒（400）", async () => {
  const { ctx, routes } = makeHost({ [ACCOUNT_RECORD_KEY]: GRANT });
  apply(ctx, {});
  const out = await callRoute(routes.get(`${BASE_PATH}/summary`), {
    url: `${BASE_PATH}/summary?year=2999&month=1`,
  });
  assert.equal(out.status, 400);
});

test("已登录时 /official?range=today 返回小时粒度", async () => {
  const { ctx, routes } = makeHost({ [ACCOUNT_RECORD_KEY]: GRANT });
  const realFetch = globalThis.fetch;
  const startSec = (url) => Number(new URL(url).searchParams.get("start"));
  globalThis.fetch = async (url) => {
    const u = String(url);
    const bucket = u.includes("get_user_summary")
      ? { code: 0, data: { biz_data: { normal_wallets: [{ currency: "CNY", balance: "10" }], bonus_wallets: [], total_costs: [{ currency: "CNY", amount: "1" }] } } }
      : u.includes("by_api_key/cost")
        ? {
            code: 0,
            data: {
              biz_data: {
                bucket: 3600,
                data: [
                  {
                    currency: "CNY",
                    series: [
                      { model: "m", buckets: [{ time: startSec(u), cost: "1.5" }, { time: startSec(u) + 3600, cost: "1.5" }] },
                    ],
                  },
                ],
              },
            },
          }
        : u.includes("by_api_key/amount")
          ? {
              code: 0,
              data: {
                biz_data: {
                  bucket: 3600,
                  series: [
                    {
                      model: "m",
                      buckets: [
                        { time: startSec(u), usage: { PROMPT_CACHE_HIT_TOKEN: "10", PROMPT_CACHE_MISS_TOKEN: "2", RESPONSE_TOKEN: "1", REQUEST: "3" } },
                        { time: startSec(u) + 3600, usage: { PROMPT_CACHE_HIT_TOKEN: "20", PROMPT_CACHE_MISS_TOKEN: "4", RESPONSE_TOKEN: "2", REQUEST: "2" } },
                      ],
                    },
                  ],
                },
              },
            }
          : { code: 0, data: { biz_data: { days: [] } } };
    return { ok: true, status: 200, json: async () => bucket, text: async () => "" };
  };

  try {
    apply(ctx, {});
    const out = await callRoute(routes.get(`${BASE_PATH}/official`), {
      url: `${BASE_PATH}/official?range=today&tz=28800`,
    });
    assert.equal(out.status, 200);
    const body = JSON.parse(out.body);
    assert.equal(body.granularity, "hour");
    assert.ok(body.points.length >= 1);
    assert.equal(body.points[0].label, "00:00");
    assert.equal(body.spent, 3);
    assert.equal(body.requests, 5);
    assert.equal(body.window.from, body.window.to);
  } finally {
    globalThis.fetch = realFetch;
  }
});
