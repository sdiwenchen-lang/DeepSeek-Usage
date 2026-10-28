/**
 * 上游客户端测试 —— 只覆盖官方真实形状（0.2.1 实测）。
 *
 * 关键契约：
 *   - 鉴权头是 `x-dsh-auth-token`（不是 Bearer）
 *   - 余额来自 get_user_summary 的 normal_wallets / bonus_wallets / total_costs
 *   - 用量与费用来自 usage/{amount,cost} 的 days[].data[].usage[]
 */

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  createApiClient,
  normalizeUser,
  normalizeUsageRows,
  normalizeCostRows,
  maskAccount,
  UpstreamError,
  UpstreamAuthError,
  TOKEN_HEADER,
  ENDPOINTS,
  normalizeRangeAmount,
  normalizeRangeCost,
} from "../src/apiclient.js";

const TOKEN = "tok_test";

/** 造一个记录请求、按序返回响应的 fetch。 */
function fakeFetch(responses) {
  const calls = [];
  let i = 0;
  const fn = async (url, init) => {
    calls.push({ url, init });
    const spec = responses[Math.min(i++, responses.length - 1)];
    const status = spec.status ?? 200;
    return {
      ok: status >= 200 && status < 300,
      status,
      json: async () => spec.json,
      text: async () => JSON.stringify(spec.json ?? ""),
    };
  };
  fn.calls = calls;
  return fn;
}

/** 官方 get_user_summary 响应。 */
const SUMMARY_BODY = {
  code: 0,
  msg: "",
  data: {
    biz_code: 0,
    biz_data: {
      normal_wallets: [{ currency: "CNY", balance: "3098.7523142400000000", token_estimation: "0" }],
      bonus_wallets: [{ currency: "CNY", balance: "12.5", token_estimation: "0" }],
      total_costs: [{ currency: "CNY", amount: "340.2026020400000000" }],
    },
  },
};

/** 官方 usage/amount 响应（两天、两模型）。 */
const AMOUNT_BODY = {
  code: 0,
  data: {
    biz_data: {
      total: [],
      days: [
        {
          date: "2026-10-01",
          data: [
            {
              model: "deepseek-flash",
              usage: [
                { type: "PROMPT_CACHE_HIT_TOKEN", amount: "100" },
                { type: "PROMPT_CACHE_MISS_TOKEN", amount: "50" },
                { type: "RESPONSE_TOKEN", amount: "25" },
                { type: "REQUEST", amount: "7" },
              ],
            },
          ],
        },
        {
          date: "2026-10-02",
          data: [
            {
              model: "deepseek-pro",
              usage: [
                { type: "PROMPT_CACHE_HIT_TOKEN", amount: "200" },
                { type: "PROMPT_CACHE_MISS_TOKEN", amount: "0" },
                { type: "RESPONSE_TOKEN", amount: "10" },
                { type: "REQUEST", amount: "3" },
              ],
            },
          ],
        },
      ],
    },
  },
};

/** 官方 usage/cost 响应：biz_data 是数组，金额为字符串。 */
const COST_BODY = {
  code: 0,
  data: {
    biz_data: [
      {
        currency: "CNY",
        total: [],
        days: [
          {
            date: "2026-10-01",
            data: [
              {
                model: "deepseek-flash",
                usage: [
                  { type: "PROMPT_CACHE_HIT_TOKEN", amount: "1.5" },
                  { type: "PROMPT_CACHE_MISS_TOKEN", amount: "0.5" },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
};

test("请求带 x-dsh-auth-token 头，不带 Bearer", async () => {
  const fetch = fakeFetch([{ json: SUMMARY_BODY }]);
  const api = createApiClient({ fetch });
  await api.fetchSummary(TOKEN);

  const { init } = fetch.calls[0];
  assert.equal(init.headers[TOKEN_HEADER], TOKEN);
  assert.equal(init.headers.authorization, undefined);
  assert.ok(init.headers["User-Agent"], "上游对裸请求 429，必须带 UA");
});

test("fetchSummary 解析余额 / 赠送 / 累计消费", async () => {
  const api = createApiClient({ fetch: fakeFetch([{ json: SUMMARY_BODY }]) });
  const user = await api.fetchSummary(TOKEN);
  assert.equal(user.total, 3111.25);
  assert.equal(user.granted, 12.5);
  assert.equal(user.toppedUp, 3098.75);
  assert.equal(user.consumedTotal, 340.2);
  assert.equal(user.currency, "CNY");
});

test("fetchUsageAmount 把 days[].data[].usage[] 摊成行", async () => {
  const api = createApiClient({ fetch: fakeFetch([{ json: AMOUNT_BODY }]) });
  const rows = await api.fetchUsageAmount(TOKEN, { year: 2026, month: 10 });

  assert.equal(rows.length, 2);
  assert.deepEqual(rows[0], { date: "2026-10-01", model: "deepseek-flash", hit: 100, miss: 50, output: 25, requests: 7 });
  assert.deepEqual(rows[1], { date: "2026-10-02", model: "deepseek-pro", hit: 200, miss: 0, output: 10, requests: 3 });
});

test("fetchUsageCost 把当日各档金额求和", async () => {
  const api = createApiClient({ fetch: fakeFetch([{ json: COST_BODY }]) });
  const rows = await api.fetchUsageCost(TOKEN, { year: 2026, month: 10 });
  assert.deepEqual(rows, [{ date: "2026-10-01", model: "deepseek-flash", cost: 2 }]);
});

test("401 → UpstreamAuthError（不重试）", async () => {
  const fetch = fakeFetch([{ status: 401, json: {} }]);
  const api = createApiClient({ fetch });
  await assert.rejects(() => api.fetchSummary(TOKEN), UpstreamAuthError);
  assert.equal(fetch.calls.length, 1);
});

test("5xx 按退避重试后失败 → UpstreamError", async () => {
  const fetch = fakeFetch([{ status: 503, json: {} }]);
  const api = createApiClient({ fetch, backoffMs: [1, 1] });
  await assert.rejects(() => api.fetchSummary(TOKEN), UpstreamError);
  assert.equal(fetch.calls.length, 3);
});

test("业务 code≠0 → UpstreamError", async () => {
  const api = createApiClient({ fetch: fakeFetch([{ json: { code: 40001, msg: "nope" } }]) });
  await assert.rejects(() => api.fetchSummary(TOKEN), UpstreamError);
});

test("normalizeUser: envelope 缺失时给零值", () => {
  assert.deepEqual(normalizeUser(undefined), { total: 0, granted: 0, toppedUp: 0, consumedTotal: 0, currency: "CNY" });
});

test("normalizeUsageRows / normalizeCostRows: 空输入不炸", () => {
  assert.deepEqual(normalizeUsageRows(undefined), []);
  assert.deepEqual(normalizeCostRows(undefined), []);
});

test("maskAccount: 邮箱与手机号", () => {
  assert.equal(maskAccount("someone@qq.com"), "s***e@qq.com");
  assert.equal(maskAccount("13812341234"), "138****1234");
  assert.equal(maskAccount(""), "");
});

test("端点常量与实测一致", () => {
  assert.equal(ENDPOINTS.SUMMARY, "/api/v0/users/get_user_summary");
  assert.equal(ENDPOINTS.USAGE_AMOUNT, "/api/v0/usage/amount");
  assert.equal(ENDPOINTS.USAGE_COST, "/api/v0/usage/cost");
  assert.equal(ENDPOINTS.RANGE_AMOUNT, "/api/v0/usage/by_api_key/amount");
  assert.equal(ENDPOINTS.RANGE_COST, "/api/v0/usage/by_api_key/cost");
});

test("normalizeRangeAmount / normalizeRangeCost: bucket 摊平并丢弃非 CNY", () => {
  const amount = normalizeRangeAmount({
    bucket: 3600,
    series: [
      {
        model: "deepseek-flash",
        buckets: [
          {
            time: 100,
            usage: {
              PROMPT_CACHE_HIT_TOKEN: "10",
              PROMPT_CACHE_MISS_TOKEN: "2",
              RESPONSE_TOKEN: "3",
              REQUEST: "4",
            },
          },
        ],
      },
    ],
  });
  assert.equal(amount.bucket, 3600);
  assert.deepEqual(amount.rows, [{ ts: 100, model: "deepseek-flash", hit: 10, miss: 2, output: 3, requests: 4 }]);

  const cost = normalizeRangeCost({
    bucket: 3600,
    data: [
      {
        currency: "CNY",
        series: [{ model: "m", buckets: [{ time: 100, cost: "1.25" }] }],
      },
      {
        currency: "USD",
        series: [{ model: "m", buckets: [{ time: 100, cost: "9" }] }],
      },
    ],
  });
  assert.deepEqual(cost.rows, [{ ts: 100, model: "m", cost: 1.25 }]);
});
