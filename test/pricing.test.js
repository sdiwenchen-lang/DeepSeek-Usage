import test from "node:test";
import assert from "node:assert/strict";

import {
  createPricing,
  estimateCost,
  isPeak,
  normalizeModel,
} from "../src/pricing.js";

const PEAK = Date.UTC(2026, 8, 29, 2, 0); // 周二 10:00 北京（工作日）
const OFFPEAK = Date.UTC(2026, 8, 29, 4, 30); // 周二 12:30 北京
const WEEKEND = Date.UTC(2026, 9, 3, 2, 0); // 周六 10:00 北京
const HOLIDAY = Date.UTC(2026, 9, 1, 2, 0); // 国庆 10:00 北京
const BUCKETS = { hit: 1_000_000, miss: 1_000_000, cacheWrite: 0, output: 1_000_000 };

test("V4 Flash 高峰按命中 / 未命中 / 输出三档计价", () => {
  const out = estimateCost({ model: "deepseek-flash", timeMs: PEAK, buckets: BUCKETS });
  assert.equal(out.cost, 10.04);
  assert.equal(out.currency, "CNY");
  assert.equal(out.pricedTokens, 3_000_000);
  assert.equal(out.unpricedTokens, 0);
  assert.equal(out.rate, "peak");
});

test("低谷价约为高峰的一半", () => {
  const peak = estimateCost({ model: "deepseek-flash", timeMs: PEAK, buckets: BUCKETS });
  const off = estimateCost({ model: "deepseek-flash", timeMs: OFFPEAK, buckets: BUCKETS });
  assert.equal(off.cost, 5.02);
  assert.equal(off.rate, "offpeak");
  assert.equal(peak.cost, 10.04);
});

test("周末和法定节假日全天按低谷价", () => {
  assert.equal(isPeak(WEEKEND), false);
  assert.equal(isPeak(HOLIDAY), false);
  for (const timeMs of [WEEKEND, HOLIDAY]) {
    const out = estimateCost({ model: "deepseek-flash", timeMs, buckets: BUCKETS });
    assert.equal(out.cost, 5.02);
  }
});

test("工作日 08:00 进入高峰，12:00 退出高峰", () => {
  assert.equal(isPeak(Date.UTC(2026, 8, 29, 0, 0)), true); // 08:00
  assert.equal(isPeak(Date.UTC(2026, 8, 29, 4, 0)), false); // 12:00
});

test("模型别名、大小写和带日期后缀都能匹配同一档价格", () => {
  const baseline = estimateCost({ model: "deepseek-flash", timeMs: PEAK, buckets: BUCKETS }).cost;
  for (const model of [
    "deepseek-v4-flash",
    "deepseek-v4.1-flash",
    "DeepSeek-V4-Flash",
    "deepseek-v4-flash-0731",
    "deepseek-v4-flash-vision-exp",
  ]) {
    assert.equal(
      estimateCost({ model, timeMs: PEAK, buckets: BUCKETS }).cost,
      baseline,
      model
    );
  }
});

test("V4 Pro 使用更高的档位", () => {
  const out = estimateCost({ model: "deepseek-v4-pro", timeMs: PEAK, buckets: BUCKETS });
  assert.equal(out.cost, 36.3);
});

test("未知模型返回 null，并把 token 记为未定价，绝不按 0 元计费", () => {
  const out = estimateCost({ model: "gpt-5.5", timeMs: PEAK, buckets: BUCKETS });
  assert.equal(out.cost, null);
  assert.equal(out.pricedTokens, 0);
  assert.equal(out.unpricedTokens, 3_000_000);
  assert.equal(out.rate, null);
});

test("quote 按峰/谷拆分桶计价，未知模型仍不按 0 元计费", () => {
  const pricing = createPricing();
  const peak = pricing.estimate({ model: "deepseek-flash", timeMs: PEAK, buckets: BUCKETS });
  const off = pricing.estimate({ model: "deepseek-flash", timeMs: OFFPEAK, buckets: BUCKETS });
  const buckets = {
    peakHit: 1_000_000, peakMiss: 1_000_000, peakOutput: 1_000_000,
    offpeakHit: 1_000_000, offpeakMiss: 1_000_000, offpeakOutput: 1_000_000,
  };
  const quoted = pricing.quote("deepseek-flash", buckets);
  assert.equal(quoted.cost, 15.06);
  assert.equal(quoted.pricedTokens, 6_000_000);
  const unknown = pricing.quote("gpt-5.5", buckets);
  assert.equal(unknown.cost, null);
  assert.equal(unknown.unpricedTokens, 6_000_000);
  assert.equal(Number((peak.cost + off.cost).toFixed(2)), quoted.cost);
});

test("可以关闭定价，关闭后同样是未定价而不是 0 元", () => {
  const pricing = createPricing({ enabled: false });
  const out = pricing.estimate({ model: "deepseek-flash", timeMs: PEAK, buckets: BUCKETS });
  assert.equal(out.cost, null);
  assert.equal(out.pricedTokens, 0);
  assert.equal(out.unpricedTokens, 3_000_000);
});

test("配置可覆盖模型价格和峰谷时段", () => {
  const pricing = createPricing({
    models: {
      "deepseek-flash": {
        peak: { miss: 10, hit: 1, cacheWrite: 0, output: 20 },
        offpeak: { miss: 5, hit: 0.5, cacheWrite: 0, output: 10 },
      },
    },
    peakIntervals: [[10 * 60, 11 * 60]],
  });
  const at10 = pricing.estimate({ model: "deepseek-flash", timeMs: PEAK, buckets: BUCKETS });
  const at12 = pricing.estimate({ model: "deepseek-flash", timeMs: OFFPEAK, buckets: BUCKETS });
  assert.equal(at10.cost, 31);
  assert.equal(at12.cost, 15.5);
});

test("normalizeModel 统一大小写、空格和下划线", () => {
  assert.equal(normalizeModel(" DeepSeek_V4_Flash "), "deepseek-v4-flash");
});
