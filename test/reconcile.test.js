/**
 * 官方/本地对账的纯函数测试。
 */

import test from "node:test";
import assert from "node:assert/strict";

import { buildReconcilePayload } from "../src/reconcile.js";

const official = {
  ok: true,
  range: "last7",
  window: { from: "2026-10-01", to: "2026-10-02" },
  tokens: { total: 1000, hit: 700, miss: 200, output: 100 },
  requests: 10,
  spent: 1.25,
  points: [
    { date: "2026-10-01", hit: 700, miss: 200, output: 100, requests: 8, cost: 1.0 },
    { date: "2026-10-02", hit: 0, miss: 0, output: 0, requests: 2, cost: 0.25 },
  ],
};

const local = {
  ok: true,
  range: "last7",
  window: { from: "2026-10-01", to: "2026-10-02" },
  tokens: { total: 800, hit: 600, miss: 150, output: 50 },
  points: [
    { key: "2026-10-01", date: "2026-10-01", tokens: 800, hit: 600, miss: 150, output: 50, requests: 6 },
    { key: "2026-10-03", date: "2026-10-03", tokens: 50, hit: 40, miss: 5, output: 5, requests: 1 },
  ],
};

test("对齐日期、计算覆盖率与差额", () => {
  const out = buildReconcilePayload({ official, local, range: "last7", now: 1 });

  assert.equal(out.ok, true);
  assert.equal(out.source, "reconcile");
  assert.equal(out.official.tokens, 1000);
  assert.equal(out.local.tokens, 800);
  assert.equal(out.coverage, 0.8);
  assert.equal(out.delta.tokens, 200);
  assert.equal(out.delta.requests, 3);
  assert.deepEqual(out.points.map((p) => p.key), ["2026-10-01", "2026-10-02", "2026-10-03"]);
  assert.equal(out.points[0].deltaTokens, 200);
  assert.equal(out.points[1].local.tokens, 0);
  assert.equal(out.points[2].official.tokens, 0);
  assert.equal(out.points[0].coverage, 0.8);
  assert.equal(out.points[2].coverage, null);
});

test("官方不可用时只保留本地，不伪造覆盖率", () => {
  const out = buildReconcilePayload({
    official: null,
    officialError: "unauthenticated",
    local,
    range: "last7",
  });

  assert.equal(out.official.available, false);
  assert.equal(out.official.error, "unauthenticated");
  assert.equal(out.local.available, true);
  assert.equal(out.coverage, null);
  assert.equal(out.delta.tokens, -800);
  assert.ok(out.caveats.some((line) => line.includes("未登录")));
  assert.equal(out.points.length, 2);
});

test("本地不可用时只保留官方", () => {
  const out = buildReconcilePayload({ official, local: null, localError: "local-unavailable", range: "last7" });
  assert.equal(out.official.available, true);
  assert.equal(out.local.available, false);
  assert.equal(out.coverage, null);
  assert.ok(out.caveats.some((line) => line.includes("会话日志")));
});

test("按小时 key 对齐（today/yesterday）", () => {
  const out = buildReconcilePayload({
    official: {
      tokens: { total: 10, hit: 8, miss: 1, output: 1 },
      points: [{ key: "2026-10-01T09", date: "2026-10-01", hour: 9, tokens: 10, requests: 1, cost: 0.1 }],
      requests: 1,
      spent: 0.1,
    },
    local: {
      tokens: { total: 8, hit: 6, miss: 1, output: 1 },
      points: [{ key: "2026-10-01T09", date: "2026-10-01", hour: 9, tokens: 8, requests: 1 }],
    },
  });
  assert.equal(out.points.length, 1);
  assert.equal(out.points[0].key, "2026-10-01T09");
  assert.equal(out.points[0].deltaTokens, 2);
});
