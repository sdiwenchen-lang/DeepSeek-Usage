import test from "node:test";
import assert from "node:assert/strict";
import { createPricer, createPricing, DEFAULT_SNAPSHOT } from "../src/pricing.js";

test("official DeepSeek legacy vision alias uses the current Flash price", () => {
  const pricer = createPricer();
  const entry = pricer.resolve("deepseek-v4-flash-vision-exp");
  assert.equal(entry?.id, "deepseek-v4-flash-vision-exp");
  assert.deepEqual(
    [entry.input, entry.output, entry.cacheRead, entry.cacheWrite],
    [0.3, 1.2, 0.006, 0],
  );
});

test("new Kimi K3.1 models expose editable benchmark rates", () => {
  const pricer = createPricer();
  assert.deepEqual(
    [pricer.resolve("kimi-k3.1-pro").input, pricer.resolve("kimi-k3.1-pro").output],
    [2, 10],
  );
  assert.deepEqual(
    [pricer.resolve("kimi-k3.1-pro-highspeed").input, pricer.resolve("kimi-k3.1-pro-highspeed").output],
    [4, 20],
  );
});

test("snapshot count is consistent and new models price all four exclusive channels", () => {
  assert.equal(DEFAULT_SNAPSHOT.count, DEFAULT_SNAPSHOT.models.length);
  const pricing = createPricing({ usdToCny: 7 });
  const buckets = { miss: 1e6, output: 1e6, hit: 1e6, cacheWrite: 1e6 };
  for (const [id, usd] of [["kimi-k3.1-pro", 14.2], ["kimi-k3.1-pro-highspeed", 28.2]]) {
    const quote = pricing.quote(id, buckets);
    assert.equal(quote.usd, usd);
    assert.equal(quote.cost, usd * 7);
    assert.equal(quote.costComplete, true);
    assert.equal(quote.pricedTokens, 4e6);
  }
});
