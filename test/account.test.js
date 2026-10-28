/**
 * 账号会话来源测试 —— 本插件不登录，只读宿主已登录的 DeepSeek 账号 grant。
 */

import { test } from "node:test";
import assert from "node:assert/strict";

import { createAccountSource, ACCOUNT_RECORD_KEY, ACCOUNT_OWNER } from "../src/account.js";

/** 假的宿主 credentials 服务（只有 record 面）。 */
function fakeHost(records, opts = {}) {
  const reads = [];
  return {
    reads,
    async readRecord(key) {
      reads.push(key);
      if (opts.delayMs) await new Promise((r) => setTimeout(r, opts.delayMs));
      return records[key];
    },
  };
}

const GRANT = { kind: "grant", payload: { version: 1, token: "tok_abc", issuer: "https://platform.deepseek.com" } };

test("记录键就是宿主平台的 default 记录", () => {
  assert.equal(ACCOUNT_OWNER, "deepseek-account-platform");
  assert.equal(ACCOUNT_RECORD_KEY, "deepseek-account-platform/default");
});

test("读出宿主 grant 里的 token", async () => {
  const host = fakeHost({ [ACCOUNT_RECORD_KEY]: GRANT });
  const account = createAccountSource(host);
  assert.equal(await account.getToken(), "tok_abc");
  assert.deepEqual(host.reads, [ACCOUNT_RECORD_KEY]);
});

test("未登录（没有记录）→ undefined，status.logged=false", async () => {
  const account = createAccountSource(fakeHost({}));
  assert.equal(await account.getToken(), undefined);
  assert.equal((await account.status()).logged, false);
});

test("有 token 时 status.logged=true", async () => {
  const account = createAccountSource(fakeHost({ [ACCOUNT_RECORD_KEY]: GRANT }));
  const st = await account.status();
  assert.equal(st.logged, true);
  assert.equal(st.source, ACCOUNT_RECORD_KEY);
});

test("TTL 内复用缓存，invalidate 后重新读库", async () => {
  const host = fakeHost({ [ACCOUNT_RECORD_KEY]: GRANT });
  let clock = 1000;
  const account = createAccountSource(host, { ttlMs: 1000, now: () => clock });

  await account.getToken();
  await account.getToken();
  assert.equal(host.reads.length, 1, "TTL 内不该重复读库");

  account.invalidate();
  await account.getToken();
  assert.equal(host.reads.length, 2);

  clock += 5000;
  await account.getToken();
  assert.equal(host.reads.length, 3, "过期后必须重新读库");
});

test("并发请求只读一次库", async () => {
  const host = fakeHost({ [ACCOUNT_RECORD_KEY]: GRANT }, { delayMs: 20 });
  const account = createAccountSource(host);
  const [a, b, c] = await Promise.all([account.getToken(), account.getToken(), account.getToken()]);
  assert.equal(a, "tok_abc");
  assert.equal(b, "tok_abc");
  assert.equal(c, "tok_abc");
  assert.equal(host.reads.length, 1);
});

test("宿主没有 record 面 → kind=none，永不抛错", async () => {
  const account = createAccountSource({});
  assert.equal(account.kind, "none");
  assert.equal(await account.getToken(), undefined);
  assert.equal((await account.status()).logged, false);
});

test("记录里 token 为空/非字符串 → 视为未登录", async () => {
  for (const payload of [{}, { token: "" }, { token: 42 }, null]) {
    const account = createAccountSource(fakeHost({ [ACCOUNT_RECORD_KEY]: { kind: "grant", payload } }));
    assert.equal(await account.getToken(), undefined);
  }
});
