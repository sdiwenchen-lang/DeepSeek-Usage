import assert from "node:assert/strict";
import test from "node:test";
import { createLocalSource } from "../src/local.js";
import { foldSession, totalTokens } from "../src/local-fold.js";

const at = (value) => Date.parse(value);
const message = (seq, time, model, input, extra = {}) => ({
  type: "assistant/message", seq, time: at(time), data: {
    turn: 0, step: seq, message: { source: { provider: "custom", model } },
    usage: { inputTokens: input, outputTokens: 10, cacheReadTokens: 20, cacheWriteTokens: 30 }, ...extra,
  },
});
const title = (value) => ({ type: "session/title", seq: 0, data: { title: value } });
function source(entries) {
  return createLocalSource({ persistence: {
    list: async () => entries.map((row) => ({ header: row.header, revision: "1" })),
    open: async (id) => {
      const row = entries.find((entry) => entry.header.id === id);
      return { inheritedEventCount: row.inherited ?? 0, read: async () => ({ events: row.events }), close: async () => {} };
    },
  } });
}
const rates = { schema: 2, usdToCny: 7, models: { "priced-one": { input: 1, output: 2, cacheRead: 0.5, cacheWrite: 1.5 } } };
const query = { from: "2026-11-06", to: "2026-11-06", tz: 28800, rates, now: at("2026-11-06T08:00:00Z") };

test("会话按查询日汇总，子会话单列，合计与模型/时间桶相等", async () => {
  const local = source([
    { header: { id: "parent" }, events: [title("预算面板"), message(1, "2026-11-05T15:59:59Z", "priced-one", 900), message(2, "2026-11-05T16:00:00Z", "priced-one", 100)] },
    { header: { id: "child", parentSession: "parent", origin: "subagent" }, events: [title("核对费率"), message(1, "2026-11-06T01:00:00Z", "priced-one", 200)] },
  ]);
  const result = await local.query(query);
  assert.deepEqual(result.sessions.map((s) => [s.sessionId, s.tokens]), [["child", 260], ["parent", 160]]);
  assert.equal(result.sessions[0].parentSession, "parent");
  assert.equal(result.sessions[0].subagent, true);
  assert.equal(result.sessions[1].title, "预算面板");
  assert.equal(result.totals.tokens, 420);
  assert.equal(result.sessions.reduce((n, row) => n + row.tokens, 0), result.totals.tokens);
  assert.equal(result.points.reduce((n, row) => n + row.tokens, 0), result.totals.tokens);
  assert.equal(result.models[0].tokens, result.totals.tokens);
  assert.ok(Math.abs(result.sessions[1].cost - 0.001225) < 1e-10);
  assert.equal(result.coverage.complete, true);
});

test("分叉继承上下文不重复计费，继承的路由仍能归属新增请求", async () => {
  const inherited = message(1, "2026-11-06T00:00:00Z", "priced-one", 999);
  const header = { type: "request/header", seq: 0, data: { header: { config: { provider: "custom", model: "priced-one" } } } };
  const chunk = { type: "assistant/chunk", seq: 2, time: at("2026-11-06T01:00:00Z"), data: { turn: 1, step: 1, chunk: { type: "usage", usage: { inputTokens: 50, outputTokens: 5 } } } };
  const local = source([{ header: { id: "fork", parentSession: "original" }, inherited: 2, events: [header, inherited, chunk] }]);
  const result = await local.query(query);
  assert.equal(result.totals.tokens, 55);
  assert.equal(result.sessions[0].models[0].model, "priced-one");
  assert.equal(result.totals.requests, 1);
});

test("会话保留模型分项供筛选，未定价费用为 null 并标注不完整", async () => {
  const local = source([{ header: { id: "mixed" }, events: [message(1, "2026-11-06T00:00:00Z", "priced-one", 100), message(2, "2026-11-06T01:00:00Z", "no-price-abc", 200)] }]);
  const result = await local.query(query);
  const session = result.sessions[0];
  assert.equal(session.tokens, 420);
  assert.equal(session.costComplete, false);
  assert.equal(session.models.find((m) => m.model === "no-price-abc").cost, null);
  assert.equal(session.models.find((m) => m.model === "priced-one").tokens, 160);
  assert.equal(result.costMeta.complete, false);
  assert.equal(result.coverage.complete, true);
});

test("缺失 usage 仅影响该查询日期的完整性", async () => {
  const local = source([{ header: { id: "missing" }, events: [message(1, "2026-11-05T01:00:00Z", "priced-one", 100, { usage: undefined }), message(2, "2026-11-06T01:00:00Z", "priced-one", 100)] }]);
  const today = await local.query(query);
  assert.equal(today.coverage.missingUsage, 0);
  assert.equal(today.coverage.complete, true);
  const yesterday = await local.query({ ...query, from: "2026-11-05", to: "2026-11-05" });
  assert.equal(yesterday.coverage.missingUsage, 1);
  assert.equal(yesterday.coverage.complete, false);
});

test("当前宿主失败请求的 stream usage 计费，重试成功不覆盖此前消耗", () => {
  const time = at("2026-11-06T01:00:00Z");
  const record = (input) => ({ type: "chunk", time, chunk: { type: "usage", usage: { inputTokens: input, outputTokens: 5 } } });
  const events = [
    { type: "request/header", seq: 0, time, data: { header: { config: { provider: "custom", model: "priced-one" } } } },
    { type: "assistant/attempt", seq: 1, time, data: { turn: 0, step: 0, stream: [record(10), record(20)] } },
    { type: "assistant/message", seq: 2, time, data: { turn: 0, step: 0, stream: [record(30)], message: { source: { provider: "custom", model: "priced-one" } } } },
  ];
  const result = foldSession(events);
  const buckets = [...result.hours.values()].flatMap((routes) => [...routes.values()]);
  assert.equal(buckets.reduce((n, row) => n + totalTokens(row), 0), 60);
  assert.equal(result.samples, 2);
  assert.deepEqual(result.missingUsageHours, {});
});

test("同一步 chunk 和最终 message 替换，不累加，reasoning 不重复加", () => {
  const time = at("2026-11-06T01:00:00Z");
  const events = [
    { type: "assistant/chunk", seq: 0, time, data: { turn: 0, step: 0, chunk: { type: "usage", usage: { inputTokens: 10, outputTokens: 5 } } } },
    { ...message(1, "2026-11-06T01:00:00Z", "priced-one", 100), data: { turn: 0, step: 0, usage: { inputTokens: 100, outputTokens: 10, reasoningTokens: 8 }, message: { source: { provider: "custom", model: "priced-one" } } } },
  ];
  const result = foldSession(events);
  const buckets = [...result.hours.values()].flatMap((routes) => [...routes.values()]);
  assert.equal(buckets.reduce((n, row) => n + totalTokens(row), 0), 110);
  assert.equal(result.samples, 1);
});
