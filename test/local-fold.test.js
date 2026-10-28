/**
 * 本地折叠的纯函数测试。
 *
 * 口径来自 `@deepseek-ai/dsh-token-meter`：
 * 四桶互斥、reasoning 是输出子集、同 (turn, step) 替换而不是累加。
 */

import test from "node:test";
import assert from "node:assert/strict";

import {
  cacheHitRate,
  dayKey,
  foldSession,
  hourKey,
  parseRouteKey,
  routeKey,
  totalTokens,
} from "../src/local-fold.js";

const TZ = 0;
const TIME = Date.UTC(2026, 9, 1, 4, 30); // 2026-10-01T04:30Z

function header(seq, provider, model, time = TIME) {
  return {
    type: "request/header",
    seq,
    time,
    data: { header: { config: { provider, model } } },
  };
}

function message(seq, turn, step, usage, source, time = TIME) {
  return {
    type: "assistant/message",
    seq,
    time,
    data: {
      turn,
      step,
      usage,
      ...(source === undefined ? {} : { message: { source } }),
    },
  };
}

function chunk(seq, turn, step, usage, time = TIME) {
  return {
    type: "assistant/chunk",
    seq,
    time,
    data: { turn, step, chunk: { type: "usage", usage } },
  };
}

const USAGE = {
  inputTokens: 200,
  cacheReadTokens: 800,
  cacheWriteTokens: 0,
  outputTokens: 60,
  reasoningTokens: 25,
  totalTokens: 1060,
};

const SOURCE = { provider: "deepseek-official", model: "deepseek-flash" };

test("同一 (turn, step) 的最终样本替换 chunk 样本，不重复累加", () => {
  const folded = foldSession([
    header(1, "deepseek-official", "deepseek-flash"),
    chunk(2, 1, 1, { inputTokens: 100, cacheReadTokens: 900, outputTokens: 50 }),
    message(3, 1, 1, USAGE, SOURCE),
  ], { tz: TZ });

  assert.equal(folded.samples, 1);
  assert.equal(folded.hours.size, 1);
  const routes = [...folded.hours.values()][0];
  const buckets = [...routes.values()][0];
  assert.deepEqual(buckets, { hit: 800, miss: 200, cacheWrite: 0, output: 60, requests: 1 });
  assert.equal(totalTokens(buckets), 1060);
  assert.equal(cacheHitRate(buckets), 80);
});

test("reasoningTokens 不额外计入总量", () => {
  const folded = foldSession([message(1, 1, 1, USAGE, SOURCE)], { tz: TZ });
  const buckets = [...[...folded.hours.values()][0].values()][0];
  assert.equal(buckets.output, 60);
  assert.equal(totalTokens(buckets), 1060);
});

test("chunk 没有来源时回退到最近一次 request/header", () => {
  const folded = foldSession([
    header(1, "deepseek-official", "deepseek-v4-flash"),
    chunk(2, 2, 3, { inputTokens: 10, cacheReadTokens: 20, outputTokens: 5 }),
  ], { tz: TZ });

  const key = [...[...folded.hours.values()][0].keys()][0];
  assert.deepEqual(parseRouteKey(key), { provider: "deepseek-official", model: "deepseek-v4-flash" });
});

test("不同 step 累加，请求数按样本计", () => {
  const folded = foldSession([
    message(1, 1, 1, { inputTokens: 10, cacheReadTokens: 20, outputTokens: 5 }, SOURCE),
    message(2, 1, 2, { inputTokens: 30, cacheReadTokens: 40, outputTokens: 7 }, SOURCE),
  ], { tz: TZ });

  assert.equal(folded.samples, 2);
  const buckets = [...[...folded.hours.values()][0].values()][0];
  assert.deepEqual(buckets, { hit: 60, miss: 40, cacheWrite: 0, output: 12, requests: 2 });
});

test("没有 turn/step 时用 seq 作为替换键", () => {
  const folded = foldSession([
    message(7, undefined, undefined, { inputTokens: 1, cacheReadTokens: 2, outputTokens: 3 }, SOURCE),
  ], { tz: TZ });
  assert.equal(folded.samples, 1);
});

test("归不上 provider/model 的样本记 unknown，不猜测", () => {
  const folded = foldSession([
    message(1, 1, 1, { inputTokens: 1, cacheReadTokens: 2, outputTokens: 3 }),
  ], { tz: TZ });

  assert.equal(folded.unattributed, 1);
  const key = [...[...folded.hours.values()][0].keys()][0];
  assert.deepEqual(parseRouteKey(key), { provider: "unknown", model: "unknown" });
});

test("cacheWrite 计入总量与命中率分母", () => {
  const folded = foldSession([
    message(1, 1, 1, { inputTokens: 100, cacheReadTokens: 200, cacheWriteTokens: 50, outputTokens: 10 }, SOURCE),
  ], { tz: TZ });
  const buckets = [...[...folded.hours.values()][0].values()][0];
  assert.deepEqual(buckets, { hit: 200, miss: 100, cacheWrite: 50, output: 10, requests: 1 });
  assert.equal(totalTokens(buckets), 360);
  assert.equal(cacheHitRate(buckets), 57.1);
});

test("按 tz 切小时/日，不按 UTC 硬切", () => {
  assert.equal(hourKey(TIME, TZ), "2026-10-01T04");
  assert.equal(hourKey(TIME, 28_800), "2026-10-01T12");
  assert.equal(dayKey(TIME, TZ), "2026-10-01");
  assert.equal(dayKey(TIME, -36_000), "2026-09-30");
});

test("routeKey 与 parseRouteKey 互逆", () => {
  const key = routeKey("deepseek-official", "deepseek-v4-pro");
  assert.deepEqual(parseRouteKey(key), { provider: "deepseek-official", model: "deepseek-v4-pro" });
});

test("启用定价后把费用、已定价和未定价 token 一起折叠", async () => {
  const { createPricing } = await import("../src/pricing.js");
  const pricing = createPricing();
  const peak = Date.UTC(2026, 8, 29, 2, 0); // 周二 10:00 北京（工作日）
  const folded = foldSession([
    message(1, 1, 1, {
      inputTokens: 1_000_000,
      cacheReadTokens: 1_000_000,
      outputTokens: 1_000_000,
    }, SOURCE, peak),
  ], { tz: TZ, pricing, now: peak });
  const buckets = [...[...folded.hours.values()][0].values()][0];
  assert.equal(buckets.cost, 10.04);
  assert.equal(buckets.pricedTokens, 3_000_000);
  assert.equal(buckets.unpricedTokens, 0);
});

test("未定价模型的 token 不混入费用", async () => {
  const { createPricing } = await import("../src/pricing.js");
  const pricing = createPricing();
  const folded = foldSession([
    message(1, 1, 1, { inputTokens: 10, cacheReadTokens: 20, outputTokens: 5 }, {
      provider: "openai",
      model: "gpt-5.5",
    }),
  ], { tz: TZ, pricing });
  const buckets = [...[...folded.hours.values()][0].values()][0];
  assert.equal(buckets.cost, 0);
  assert.equal(buckets.pricedTokens, 0);
  assert.equal(buckets.unpricedTokens, 35);
});
