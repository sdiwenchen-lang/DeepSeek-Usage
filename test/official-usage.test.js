import test from "node:test";
import assert from "node:assert/strict";
import { createOfficialUsage, officialDayWindow } from "../src/official-usage.js";
import { createApiClient } from "../src/apiclient.js";
import { createBudget } from "../src/budget.js";

const now = () => Date.parse("2026-11-06T12:00:00+08:00");

test("official budget window is the Beijing day", () => {
  assert.deepEqual(officialDayWindow(now()), {
    start: Date.parse("2026-11-05T16:00:00Z") / 1000,
    end: Date.parse("2026-11-06T16:00:00Z") / 1000,
  });
});

test("official usage sums today's amount and cost rows", async () => {
  const official = createOfficialUsage({
    now,
    account: { async getToken() { return "token"; }, invalidate() {} },
    api: {
      async fetchRangeAmount() { return { rows: [{ hit: 10, miss: 20, output: 30 }, { hit: 1, miss: 2, output: 3 }] }; },
      async fetchRangeCost() { return { rows: [{ cost: 4.1 }, { cost: 0.56 }] }; },
    },
  });
  const value = await official.usage({ force: true });
  assert.equal(value.available, true);
  assert.equal(value.tokens, 66);
  assert.equal(value.cost, 4.66);
});

test("official usage reports missing login without throwing", async () => {
  const official = createOfficialUsage({
    now,
    account: { async getToken() { return undefined; }, invalidate() {} },
    api: { async fetchRangeAmount() { throw new Error("must not call"); }, async fetchRangeCost() { throw new Error("must not call"); } },
  });
  const value = await official.usage();
  assert.equal(value.available, false);
  assert.equal(value.error, "unauthenticated");
});

test("malformed official responses make the guard incomplete instead of reporting zero usage", async () => {
  const api = createApiClient({ fetch: async () => ({ status: 200, ok: true, json: async () => ({ data: { biz_data: { unexpected: true } } }) }) });
  const official = createOfficialUsage({ now, account: { async getToken() { return "token"; } }, api });
  try {
    const value = await official.usage();
    assert.equal(value.available, false);
    assert.equal(value.error, "invalid-upstream-response");
    assert.equal(value.tokens, null);
    const budget = createBudget({ now, official, initial: {
      mode: "official", tokens: { enabled: true, limit: 100 }, cny: { enabled: true, limit: 1 },
    } });
    const { status } = await budget.read();
    assert.equal(status.complete, false);
    assert.equal(status.tokens, null);
    assert.equal(status.blocked, false);
    assert.ok(status.incompleteReasons.includes("invalid-upstream-response"));
  } finally { api.dispose(); }
});
