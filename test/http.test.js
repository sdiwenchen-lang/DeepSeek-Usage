import { test } from "node:test";
import assert from "node:assert/strict";
import {
  isLoopbackAddress,
  hostNameOf,
  pathOf,
  screenRequest,
  summaryQuery,
  officialQuery,
  officialRangeWindow,
  monthsForRange,
  buildSummaryPayload,
  buildOfficialPayload,
  buildHourlyPayload,
  tzOffsetSeconds,
  localDayStart,
  localHourFloor,
  localDate,
  BASE_PATH,
  STATUS_PATH,
} from "../src/http.js";

test("isLoopbackAddress: 127.0.0.1 / ::1 / mapped form", () => {
  assert.equal(isLoopbackAddress("127.0.0.1"), true);
  assert.equal(isLoopbackAddress("::1"), true);
  assert.equal(isLoopbackAddress("::ffff:127.0.0.1"), true);
  assert.equal(isLoopbackAddress("localhost"), true);
  assert.equal(isLoopbackAddress("10.0.0.1"), false);
  assert.equal(isLoopbackAddress(""), false);
  assert.equal(isLoopbackAddress(undefined), false);
});

test("hostNameOf: strips port", () => {
  assert.equal(hostNameOf("localhost:8080"), "localhost");
  assert.equal(hostNameOf("127.0.0.1:3000"), "127.0.0.1");
  assert.equal(hostNameOf("[::1]:8080"), "::1");
  assert.equal(hostNameOf(""), "");
});

test("pathOf: pathname only", () => {
  assert.equal(pathOf("/api/deepseek-usage/summary?year=2026"), "/api/deepseek-usage/summary");
});

test("screenRequest: GET from loopback passes", () => {
  const req = {
    method: "GET",
    url: STATUS_PATH,
    socket: { remoteAddress: "127.0.0.1" },
    headers: { host: "localhost:8080" },
  };
  assert.equal(screenRequest(req), undefined);
});

test("screenRequest: POST 一律 405（端点只读）", () => {
  const req = {
    method: "POST",
    url: STATUS_PATH,
    socket: { remoteAddress: "127.0.0.1" },
    headers: { host: "localhost" },
  };
  const r = screenRequest(req);
  assert.equal(r.status, 405);
});

test("screenRequest: non-loopback peer forbidden", () => {
  const r = screenRequest({
    method: "GET",
    url: STATUS_PATH,
    socket: { remoteAddress: "10.0.0.1" },
    headers: { host: "localhost" },
  });
  assert.equal(r.status, 403);
});

test("screenRequest: false Host header forbidden", () => {
  const r = screenRequest({
    method: "GET",
    url: STATUS_PATH,
    socket: { remoteAddress: "127.0.0.1" },
    headers: { host: "evil.com" },
  });
  assert.equal(r.status, 403);
});

test("summaryQuery: 默认当年当月", () => {
  const now = new Date();
  const q = summaryQuery("");
  assert.equal(q.year, now.getFullYear());
  assert.equal(q.month, now.getMonth() + 1);
  assert.equal(q.force, false);
});

test("summaryQuery: 解析显式输入", () => {
  const q = summaryQuery("/summary?year=2026&month=10&force=1");
  assert.equal(q.year, 2026);
  assert.equal(q.month, 10);
  assert.equal(q.force, true);
});

test("officialQuery: range 限制", () => {
  assert.equal(officialQuery("/official?range=today").range, "today");
  assert.equal(officialQuery("/official?range=last7").range, "last7");
  assert.equal(officialQuery("/official?range=last30").range, "last30");
  assert.equal(officialQuery("/official?range=thisMonth").range, "thisMonth");
  assert.equal(officialQuery("/official?range=lastMonth&force=1").force, true);
  assert.equal(officialQuery("/official?range=bogus").range, "today");
});

test("officialRangeWindow / monthsForRange: 跨月、跨年及上月边界", () => {
  const now = Date.UTC(2026, 0, 3, 4); // 本地日历语义使用运行环境时区
  assert.deepEqual(officialRangeWindow("today", now), { from: "2026-01-03", to: "2026-01-03" });
  assert.deepEqual(officialRangeWindow("yesterday", now), { from: "2026-01-02", to: "2026-01-02" });
  assert.deepEqual(officialRangeWindow("last7", Date.UTC(2026, 2, 2, 12)), { from: "2026-02-24", to: "2026-03-02" });
  assert.deepEqual(officialRangeWindow("last30", Date.UTC(2026, 0, 3, 12)), { from: "2025-12-05", to: "2026-01-03" });
  assert.deepEqual(officialRangeWindow("lastMonth", Date.UTC(2026, 0, 3, 12)), { from: "2025-12-01", to: "2025-12-31" });
  assert.deepEqual(monthsForRange("last7", Date.UTC(2026, 2, 2, 12)), [{ year: 2026, month: 2 }, { year: 2026, month: 3 }]);
  assert.deepEqual(monthsForRange("last30", Date.UTC(2026, 0, 3, 12)), [{ year: 2025, month: 12 }, { year: 2026, month: 1 }]);
});

test("buildSummaryPayload: 聚合本月每日 + 模型拆分", () => {
  const amountRows = [
    { date: "2026-10-15", model: "deepseek-chat", hit: 1782000, miss: 412838, output: 218000, requests: 462 },
    { date: "2026-10-15", model: "deepseek-reasoner", hit: 120000, miss: 60000, output: 30000, requests: 38 },
    { date: "2026-10-16", model: "deepseek-chat", hit: 980000, miss: 200000, output: 110000, requests: 284 },
  ];
  const costRows = [
    { date: "2026-10-15", model: "deepseek-chat", cost: 2.06 },
    { date: "2026-10-15", model: "deepseek-reasoner", cost: 0.42 },
    { date: "2026-10-16", model: "deepseek-chat", cost: 1.18 },
  ];
  const p = buildSummaryPayload({
    amountRows,
    costRows,
    user: { total: 87.63, granted: 10, toppedUp: 77.63, accountMasked: "s***n@qq.com" },
    year: 2026,
    month: 10,
    now: Date.UTC(2026, 9, 16),
  });
  assert.equal(p.days.length, 2);
  const d15 = p.days[0];
  assert.equal(d15.date, "2026-10-15");
  assert.equal(d15.hit, 1902000);
  assert.equal(d15.miss, 472838);
  assert.equal(d15.output, 248000);
  assert.equal(d15.requests, 500);
  assert.equal(d15.cost, 2.48);
  // 月汇总
  const allHit = 1902000 + 980000;
  const allMiss = 472838 + 200000;
  assert.equal(p.month.tokens, allHit + allMiss + 248000 + 110000);
  assert.equal(p.month.cost, 3.66);
  // 模型拆分
  assert.equal(p.models.length, 2);
  const chat = p.models.find((m) => m.model === "deepseek-chat");
  assert.equal(chat.tokens, 1782000 + 412838 + 218000 + 980000 + 200000 + 110000);
});

test("buildOfficialPayload: today 切窗只取今日", () => {
  const p = buildOfficialPayload({
    summary: {
      balance: { total: 87.63, granted: 10, toppedUp: 77.63, consumedTotal: 3, accountMasked: "" },
      days: [
        { date: "2026-10-15", hit: 100, miss: 50, output: 20, requests: 3, cost: 1 },
        { date: "2026-10-16", hit: 200, miss: 80, output: 40, requests: 5, cost: 2 },
      ],
      month: { cost: 3, tokens: 490, requests: 8, hitRate: 0.6 },
    },
    range: "today",
    now: Date.UTC(2026, 9, 16),
  });
  assert.equal(p.tokens.total, 320);
  assert.equal(p.requests, 5);
  assert.equal(p.spent, 2);
  assert.equal(p.consumedTotal, 3);
  assert.equal(p.days.length, 1);
  assert.equal(p.window.from, "2026-10-16");
});

test("buildOfficialPayload: 范围汇总按模型、补齐无数据日期并保留官方累计消费", () => {
  const p = buildOfficialPayload({
    summary: {
      balance: { total: 90, consumedTotal: 345.67 },
      days: [
        { date: "2026-03-01", hit: 10, miss: 2, output: 3, requests: 2, cost: 1.25, models: [
          { model: "deepseek-chat", tokens: 15, requests: 2, cost: 1.25 },
        ] },
        { date: "2026-03-02", hit: 20, miss: 3, output: 4, requests: 3, cost: 2.5, models: [
          { model: "deepseek-chat", tokens: 27, requests: 2, cost: 1.5 },
          { model: "deepseek-reasoner", tokens: 0, requests: 1, cost: 1 },
        ] },
      ],
      user: { consumedTotal: 345.67 },
    },
    range: "last7",
    now: Date.UTC(2026, 2, 2, 12),
  });
  assert.equal(p.days.length, 7);
  assert.equal(p.days[0].date, "2026-02-24");
  assert.equal(p.days[0].cost, 0);
  assert.equal(p.spent, 3.75);
  assert.equal(p.requests, 5);
  assert.equal(p.tokens.total, 42);
  assert.equal(p.consumedTotal, 345.67);
  assert.deepEqual(p.models.map((m) => m.model), ["deepseek-chat", "deepseek-reasoner"]);
  assert.equal(p.models[0].cost, 2.75);
});

test("buildOfficialPayload: 三色构成比例 = 各段/total", () => {
  const p = buildOfficialPayload({
    summary: {
      balance: {},
      days: [{ date: "2026-10-16", hit: 200, miss: 80, output: 40, requests: 5, cost: 0 }],
      month: { cost: 0 },
    },
    range: "today",
    now: Date.UTC(2026, 9, 16),
  });
  assert.equal(p.tokens.ratio.hit, 0.625);
  assert.equal(p.tokens.ratio.miss, 0.25);
  assert.equal(p.tokens.ratio.output, 0.125);
});

test("BASE_PATH: /api/deepseek-usage，且不再有登录端点", () => {
  assert.equal(BASE_PATH, "/api/deepseek-usage");
});

test("tzOffsetSeconds: 只接受上游同款 15 分钟整数倍", () => {
  assert.equal(tzOffsetSeconds("28800"), 28800);
  assert.equal(tzOffsetSeconds("-18000"), -18000);
  assert.equal(tzOffsetSeconds("19800"), 19800);
  assert.equal(tzOffsetSeconds("abc"), -new Date().getTimezoneOffset() * 60);
  assert.equal(tzOffsetSeconds("100"), -new Date().getTimezoneOffset() * 60);
});

test("本地日/小时边界：东八区 00:00 落在 UTC 前一天 16:00", () => {
  const midnight = Date.UTC(2026, 9, 26, 16, 0, 0) / 1000; // 2026-10-27 00:00 +08
  assert.equal(localDayStart(midnight + 3600 * 19, 28800), midnight);
  assert.equal(localDate(midnight, 28800), "2026-10-27");
  assert.equal(localHourFloor(midnight + 19 * 3600 + 59 * 60, 28800), midnight + 19 * 3600);
});

test("buildHourlyPayload: 今天按小时聚合，金额/请求/token 与官方口径一致", () => {
  const start = Date.UTC(2026, 9, 26, 16, 0, 0) / 1000; // 2026-10-27 00:00 +08
  const amount = {
    bucket: 3600,
    rows: [
      { ts: start, model: "deepseek-flash", hit: 100, miss: 10, output: 5, requests: 2 },
      { ts: start + 3600, model: "deepseek-flash", hit: 200, miss: 20, output: 10, requests: 3 },
      { ts: start + 3600, model: "deepseek-chat", hit: 50, miss: 5, output: 1, requests: 1 },
    ],
  };
  const cost = {
    bucket: 3600,
    rows: [
      { ts: start, model: "deepseek-flash", cost: 1.25 },
      { ts: start + 3600, model: "deepseek-flash", cost: 2.5 },
      { ts: start + 3600, model: "deepseek-chat", cost: 0.22 },
    ],
  };
  const user = { total: 10, granted: 0, toppedUp: 10, consumedTotal: 1, currency: "CNY" };
  const payload = buildHourlyPayload({
    amount,
    cost,
    user,
    range: "today",
    now: (start + 2 * 3600) * 1000,
    tz: 28800,
    start,
    end: start + 3 * 3600,
  });

  assert.equal(payload.granularity, "hour");
  assert.equal(payload.points.length, 3);
  assert.equal(payload.points[0].label, "00:00");
  assert.equal(payload.points[1].label, "01:00");
  assert.equal(payload.points[0].date, "2026-10-27");
  assert.equal(payload.spent, 3.97);
  assert.equal(payload.requests, 6);
  assert.equal(payload.tokens.total, 401);
  assert.equal(payload.days[0].cost, 3.97);
  assert.deepEqual(
    payload.models.map((m) => m.model),
    ["deepseek-flash", "deepseek-chat"]
  );
});

test("buildHourlyPayload: 空窗口也给一天的零值", () => {
  const start = Date.UTC(2026, 9, 26, 16, 0, 0) / 1000;
  const payload = buildHourlyPayload({
    amount: { bucket: 3600, rows: [] },
    cost: { bucket: 3600, rows: [] },
    user: { total: 0, granted: 0, toppedUp: 0, consumedTotal: 0, currency: "CNY" },
    range: "today",
    now: start * 1000,
    tz: 28800,
    start,
    end: start,
  });
  assert.equal(payload.points.length, 0);
  assert.equal(payload.spent, 0);
  assert.equal(payload.days.length, 1);
  assert.equal(payload.days[0].date, "2026-10-27");
});
