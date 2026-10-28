/**
 * 本地数据源：用内存 sessionPersistence 验证 revision 缓存、scope、补空桶。
 */

import test from "node:test";
import assert from "node:assert/strict";

import { createLocalSource } from "../src/local.js";

const DAY = "2026-10-01";
const NOW = Date.UTC(2026, 9, 1, 12, 0, 0); // 本地 12:00（tz=0）
const TZ = 0;

function events(provider, tokens) {
  return [
    {
      type: "request/header",
      seq: 1,
      time: Date.UTC(2026, 9, 1, 4, 30),
      data: { header: { config: { provider, model: "deepseek-flash" } } },
    },
    {
      type: "assistant/message",
      seq: 2,
      time: Date.UTC(2026, 9, 1, 4, 30),
      data: {
        turn: 1,
        step: 1,
        usage: {
          inputTokens: tokens.miss,
          cacheReadTokens: tokens.hit,
          outputTokens: tokens.output,
        },
        message: { source: { provider, model: "deepseek-flash" } },
      },
    },
  ];
}

function fixture() {
  const snapshots = [
    { header: { id: "s1", createdAt: 1 }, revision: "1" },
    { header: { id: "s2", createdAt: 2 }, revision: "1" },
  ];
  let reads = 0;
  const persistence = {
    async listSnapshots() {
      return snapshots;
    },
    async readFrom(id) {
      reads += 1;
      return {
        events: id === "s1"
          ? events("deepseek-official", { hit: 900, miss: 100, output: 50 })
          : events("dsapi", { hit: 400, miss: 600, output: 25 }),
      };
    },
  };
  return { snapshots, persistence, reads: () => reads };
}

test("默认 deepseek scope 排除中转；all 包含全部 provider", async () => {
  const f = fixture();
  const source = createLocalSource({ persistence: f.persistence, config: { sweepTtlMs: 0 } });

  const official = await source.query({ from: DAY, to: DAY, tz: TZ, scope: "deepseek", granularity: "day", now: NOW });
  assert.equal(official.tokens.total, 1050);
  assert.equal(official.tokens.hit, 900);
  assert.equal(official.tokens.miss, 100);
  assert.equal(official.tokens.output, 50);
  assert.equal(official.tokens.hitRate, 90);
  assert.equal(official.requests, 1);
  assert.deepEqual(official.providers.map((p) => p.provider), ["deepseek-official"]);

  const all = await source.query({ from: DAY, to: DAY, tz: TZ, scope: "all", granularity: "day", now: NOW });
  assert.equal(all.tokens.total, 2075);
  assert.equal(all.requests, 2);
  assert.equal(all.providers.length, 2);
  assert.equal(all.coverage.sessions, 2);
  assert.equal(all.coverage.sessionsWithUsage, 2);
});

test("revision 未变不重读；变了只重读该会话", async () => {
  const f = fixture();
  const source = createLocalSource({ persistence: f.persistence, config: { sweepTtlMs: 0 } });

  await source.sweep(TZ, true);
  assert.equal(f.reads(), 2);
  await source.sweep(TZ, true);
  assert.equal(f.reads(), 2, "revision 未变时不应重复 readFrom");

  f.snapshots[0].revision = "2";
  await source.sweep(TZ, true);
  assert.equal(f.reads(), 3, "只重读 revision 变化的那一个会话");
});

test("按小时查询补齐到当前小时，且只填本日", async () => {
  const f = fixture();
  const source = createLocalSource({ persistence: f.persistence, config: { sweepTtlMs: 0 } });
  const out = await source.query({ from: DAY, to: DAY, tz: TZ, scope: "deepseek", granularity: "hour", now: NOW });

  assert.equal(out.points.length, 13); // 00:00–12:00
  assert.equal(out.points[4].hour, 4);
  assert.equal(out.points[4].tokens, 1050);
  assert.equal(out.points[12].tokens, 0);
  assert.equal(out.points[12].label, "12:00");
});

test("按天查询补齐空日期", async () => {
  const f = fixture();
  const source = createLocalSource({ persistence: f.persistence, config: { sweepTtlMs: 0 } });
  const out = await source.query({ from: "2026-09-30", to: "2026-10-02", tz: TZ, scope: "deepseek", granularity: "day", now: NOW });

  assert.deepEqual(out.points.map((p) => p.date), ["2026-09-30", "2026-10-01", "2026-10-02"]);
  assert.equal(out.points[1].tokens, 1050);
  assert.equal(out.points[0].tokens, 0);
});

test("宿主没有 sessionPersistence 时查询明确报 local-unavailable", async () => {
  const source = createLocalSource({});
  await assert.rejects(
    () => source.query({ from: DAY, to: DAY, tz: TZ, scope: "deepseek", granularity: "day", now: NOW }),
    (error) => error.code === "local-unavailable"
  );
  assert.equal(source.status(TZ).available, false);
});

test("空会话列表返回空桶而不是报错", async () => {
  const source = createLocalSource({
    persistence: { async listSnapshots() { return []; }, async readFrom() { return { events: [] }; } },
    config: { sweepTtlMs: 0 },
  });
  const out = await source.query({ from: DAY, to: DAY, tz: TZ, scope: "deepseek", granularity: "day", now: NOW });
  assert.equal(out.tokens.total, 0);
  assert.equal(out.points.length, 1);
  assert.equal(out.coverage.sessions, 0);
});

test("现行宿主 API：list() + open(id, 'read') + read(0) + close()", async () => {
  let closed = 0;
  const source = createLocalSource({
    persistence: {
      async list() {
        return [{ header: { id: "s1", createdAt: 1 }, revision: "r1" }];
      },
      async open(id, mode) {
        assert.equal(id, "s1");
        assert.equal(mode, "read");
        return {
          async read(offset) {
            assert.equal(offset, 0);
            return { eventState: "shared-frozen", events: events("deepseek-official", { hit: 900, miss: 100, output: 50 }) };
          },
          async close() { closed += 1; },
        };
      },
    },
    config: { sweepTtlMs: 0 },
  });

  const out = await source.query({ from: DAY, to: DAY, tz: TZ, scope: "deepseek", granularity: "day", now: NOW });
  assert.equal(out.tokens.total, 1050);
  assert.equal(closed, 1, "read handle 必须关闭");
});

test("本地费用按官方价估算，并报告定价覆盖", async () => {
  const f = fixture();
  const source = createLocalSource({ persistence: f.persistence, config: { sweepTtlMs: 0 } });
  const out = await source.query({ from: DAY, to: DAY, tz: TZ, scope: "deepseek", granularity: "day", now: NOW });
  assert.equal(out.costMeta.currency, "CNY");
  assert.equal(out.costMeta.complete, true);
  assert.equal(out.costMeta.pricedTokens, 1050);
  assert.equal(out.costMeta.unpricedTokens, 0);
  assert.equal(out.cost, 0); // 1050 token 的费用不足 0.01 元，按展示精度舍入
  assert.equal(out.models[0].cost, 0);
});

test("all scope 遇到未定价模型时 total 只报部分费用并标记未覆盖", async () => {
  const persistence = {
    async listSnapshots() {
      return [{ header: { id: "s1", createdAt: 1 }, revision: "1" }];
    },
    async readFrom() {
      return {
        events: [
          {
            type: "assistant/message",
            seq: 1,
            time: Date.UTC(2026, 9, 1, 2),
            data: {
              turn: 1,
              step: 1,
              usage: { inputTokens: 1_000_000, cacheReadTokens: 0, outputTokens: 0 },
              message: { source: { provider: "openai", model: "gpt-5.5" } },
            },
          },
        ],
      };
    },
  };
  const source = createLocalSource({ persistence, config: { sweepTtlMs: 0 } });
  const out = await source.query({ from: DAY, to: DAY, tz: TZ, scope: "all", granularity: "day", now: NOW });
  assert.equal(out.cost, null);
  assert.equal(out.costMeta.complete, false);
  assert.equal(out.costMeta.pricedTokens, 0);
  assert.equal(out.costMeta.unpricedTokens, 1_000_000);
  assert.deepEqual(out.costMeta.unpricedModels, ["gpt-5.5"]);
});

test("本地费用按峰谷价逐桶计算，节假日按低谷价", async () => {
  const peak = Date.UTC(2026, 9, 1, 2); // 国庆 10:00 北京，低谷
  const persistence = {
    async listSnapshots() {
      return [{ header: { id: "s1", createdAt: 1 }, revision: "1" }];
    },
    async readFrom() {
      return {
        events: [
          {
            type: "assistant/message",
            seq: 1,
            time: peak,
            data: {
              turn: 1,
              step: 1,
              usage: { inputTokens: 1_000_000, cacheReadTokens: 1_000_000, outputTokens: 1_000_000 },
              message: { source: { provider: "deepseek-official", model: "deepseek-flash" } },
            },
          },
        ],
      };
    },
  };
  const source = createLocalSource({ persistence, config: { sweepTtlMs: 0 } });
  const out = await source.query({ from: DAY, to: DAY, tz: TZ, scope: "deepseek", granularity: "day", now: NOW });
  assert.equal(out.cost, 5.02);
  assert.equal(out.costMeta.complete, true);
  assert.equal(out.points[0].cost, 5.02);
  assert.equal(out.models[0].cost, 5.02);
});

test("工作日高峰按原价计算", async () => {
  const peak = Date.UTC(2026, 8, 29, 2); // 周二 10:00 北京
  const persistence = {
    async listSnapshots() {
      return [{ header: { id: "s1", createdAt: 1 }, revision: "1" }];
    },
    async readFrom() {
      return {
        events: [{
          type: "assistant/message",
          seq: 1,
          time: peak,
          data: {
            turn: 1,
            step: 1,
            usage: { inputTokens: 1_000_000, cacheReadTokens: 1_000_000, outputTokens: 1_000_000 },
            message: { source: { provider: "deepseek-official", model: "deepseek-flash" } },
          },
        }],
      };
    },
  };
  const source = createLocalSource({ persistence, config: { sweepTtlMs: 0 } });
  const out = await source.query({ from: "2026-09-29", to: "2026-09-29", tz: TZ, scope: "deepseek", granularity: "day", now: NOW });
  assert.equal(out.cost, 10.04);
});

test("all scope 能看到 gpt-6.1-sol，并可用自定义费率计价", async () => {
  const persistence = {
    async listSnapshots() {
      return [{ header: { id: "s1", createdAt: 1 }, revision: "1" }];
    },
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
  };
  const source = createLocalSource({ persistence, config: { sweepTtlMs: 0 } });
  const base = await source.query({ from: "2026-09-29", to: "2026-09-29", tz: TZ, scope: "all", granularity: "day", now: NOW });
  assert.equal(base.models[0].model, "gpt-6.1-sol");
  assert.equal(base.cost, null);
  assert.deepEqual(base.costMeta.unpricedModels, ["gpt-6.1-sol"]);

  const rates = {
    "gpt-6.1-sol": {
      peak: { hit: 1, miss: 10, cacheWrite: 0, output: 20 },
      offpeak: { hit: 0.5, miss: 5, cacheWrite: 0, output: 10 },
    },
  };
  const priced = await source.query({ from: "2026-09-29", to: "2026-09-29", tz: TZ, scope: "all", granularity: "day", now: NOW, rates });
  assert.equal(priced.cost, 30);
  assert.equal(priced.costMeta.source, "自定义费率");
  assert.equal(priced.costMeta.complete, true);
});
