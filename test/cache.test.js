import { test } from "node:test";
import assert from "node:assert/strict";
import { createCache } from "../src/cache.js";

test("cache: 命中即返回", async () => {
  let calls = 0;
  const cache = createCache({ ttlMs: 1000 });
  const r = await cache.getOrFetch("k", async () => {
    calls++;
    return { v: 1 };
  });
  const r2 = await cache.getOrFetch("k", async () => {
    calls++;
    return { v: 2 };
  });
  assert.equal(calls, 1);
  assert.deepEqual(r, { v: 1 });
  assert.deepEqual(r2, { v: 1 });
});

test("cache: TTL 过期后重新拉取", async () => {
  let calls = 0;
  let now = 0;
  const cache = createCache({ ttlMs: 100, now: () => now });
  await cache.getOrFetch("k", async () => {
    calls++;
    return "a";
  });
  now += 200;
  const v = await cache.getOrFetch("k", async () => {
    calls++;
    return "b";
  });
  assert.equal(calls, 2);
  assert.equal(v, "b");
});

test("cache: in-flight 去重", async () => {
  let calls = 0;
  const cache = createCache({ ttlMs: 1000 });
  const producer = async () => {
    calls++;
    await new Promise((r) => setTimeout(r, 10));
    return "x";
  };
  const [a, b, c] = await Promise.all([
    cache.getOrFetch("k", producer),
    cache.getOrFetch("k", producer),
    cache.getOrFetch("k", producer),
  ]);
  assert.equal(calls, 1);
  assert.equal(a, "x");
  assert.equal(b, "x");
  assert.equal(c, "x");
});

test("cache: force 跳过缓存", async () => {
  let calls = 0;
  const cache = createCache({ ttlMs: 1000 });
  await cache.getOrFetch("k", async () => {
    calls++;
    return "a";
  });
  await cache.getOrFetch(
    "k",
    async () => {
      calls++;
      return "b";
    },
    { force: true }
  );
  assert.equal(calls, 2);
});

test("cache: clear 清空", async () => {
  let calls = 0;
  const cache = createCache({ ttlMs: 1000 });
  await cache.getOrFetch("k", async () => {
    calls++;
    return 1;
  });
  cache.clear();
  await cache.getOrFetch("k", async () => {
    calls++;
    return 2;
  });
  assert.equal(calls, 2);
});

test("cache: producer 失败不缓存", async () => {
  let calls = 0;
  const cache = createCache({ ttlMs: 1000 });
  await assert.rejects(() =>
    cache.getOrFetch("k", async () => {
      calls++;
      throw new Error("boom");
    })
  );
  // 下次仍应触发 producer
  await assert.rejects(() =>
    cache.getOrFetch("k", async () => {
      calls++;
      throw new Error("boom");
    })
  );
  assert.equal(calls, 2);
});