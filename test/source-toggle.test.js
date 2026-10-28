/**
 * 数据源开关 & 侧边栏跟随的静态契约。
 *
 * 侧边栏是独立 slot，拿不到面板 React state；必须通过 localStorage + 自定义事件共享，
 * 并且本地模式不能被侧边栏偷偷回退到官方接口。
 */

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const code = readFileSync(new URL("../src/client.js", import.meta.url), "utf8");

test("数据源落盘并通过事件同步；本地固定包含全部 Provider", () => {
  assert.match(code, /deepseekUsageMode/);
  assert.doesNotMatch(code, /deepseekUsageLocalScope/);
  assert.match(code, /deepseek-usage:source/);
  assert.match(code, /writeSourceMode\("local"\)/);
  assert.doesNotMatch(code, /全部 Provider/);
  assert.doesNotMatch(code, /本地统计范围/);
});

test("侧边栏按模式选择 /local 或 /official，本地固定 scope=all", () => {
  assert.match(code, /mode === "local"[\s\S]{0,140}\/local\?range=today/);
  assert.match(code, /\/local\?range=today&tz=" \+ TZ \+ "&scope=all/);
  assert.match(code, /\}, \[mode\]\);/);
  assert.match(code, /deepseekUsageRates/);
  assert.match(code, /费率设置/);
});

test("本地费用显示为「≈ 估算」，不再强制写成 —", () => {
  assert.match(code, /setToday\(\{ tokens: t\.tokens, cost: t\.cost, requests: t\.requests/);
  assert.match(code, /\(mode === "local" \? "≈" : ""\) \+ fmtMoney/);
  assert.match(code, /按当前费率估算/);
  assert.doesNotMatch(code, /cost: mode === "local" \? null/);
});

test("旧宿主没有 sessionPersistence 时回落到官方", () => {
  assert.match(code, /status\.local\.available !== false/);
  assert.match(code, /!available && readSourceMode\(\) === "local"/);
  assert.match(code, /writeSourceMode\("official"\)/);
});
