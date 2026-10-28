import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const SRC = join(ROOT, "src");

function readSrc(name) {
  return readFileSync(join(SRC, name), "utf8");
}

test("P1 防护：服务端源码无轮询式 setInterval", () => {
  const files = ["index.js", "account.js", "apiclient.js", "cache.js", "http.js"];
  for (const f of files) {
    const code = readSrc(f);
    // setInterval（轮询）严格禁止；setTimeout 用于请求超时/重试退避是允许的
    assert.ok(!/setInterval\s*\(/.test(code), `${f}: 禁止 setInterval（无后台轮询）`);
  }
  // http.js 的 nag 警告 setTimeout 必须 unref，防泄漏 timer
  const httpCode = readSrc("http.js");
  const httpTimeouts = httpCode.match(/setTimeout\s*\(/g) || [];
  if (httpTimeouts.length > 0) {
    assert.ok(/\.unref/.test(httpCode), "http.js 的 setTimeout 必须 unref 防泄漏");
  }
});

test("S1 防护：凭据不写入明文文件，端点响应不下发 token/password", () => {
  const files = ["index.js", "account.js", "apiclient.js", "cache.js", "http.js"];
  for (const f of files) {
    const code = readSrc(f);
    assert.ok(!/writeFileSync\s*\(/.test(code), `${f}: 禁止 writeFileSync（凭据不落盘）`);
  }
  // 端点 send 的 status() 返回值不得包含 token/password 字段
  const httpCode = readSrc("http.js");
  // status 端点返回的是 auth.status() 的结果，结构是 {ok, logged, accountMasked, expiresAt, degraded, reauthing}
  // 断言 buildSummaryPayload / buildOfficialPayload / status 返回对象字面量里没有 userToken/password 键
  // 用更精准的模式：send(res, 200, { ... }) 返回字面量里不得出现 userToken: 或 password:
  const sendReturns = httpCode.match(/send\(res,\s*\d+,\s*\{[^}]*\}/g) || [];
  for (const ret of sendReturns) {
    assert.ok(!/\buserToken\b/.test(ret), "端点响应不得包含 userToken 字段");
    assert.ok(!/\bpassword\b/.test(ret), "端点响应不得包含 password 字段");
  }
});

test("S3 防护：端点全部基于 loopback + Host 双校验", () => {
  const code = readSrc("http.js");
  assert.ok(/isLoopbackAddress\(req\.socket\?\.remoteAddress\)/.test(code), "screenRequest 必须校验 peer socket 地址");
  assert.ok(/hostNameOf\(req\.headers\?\.host\)/.test(code), "screenRequest 必须校验 Host 头");
});

test("P2 防护：客户端声明宿主 runtime 注入", () => {
  const manifest = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8"));
  assert.deepEqual(manifest.dsh.client.inject, ["@deepseek-ai/dsh-client-runtime"]);
});

test("P2 防护：面板样式独立下发，不内联进 bundle", () => {
  const css = readSrc("panel.css");
  assert.ok(css.length > 20_000, "样式表应包含完整 UI 稿样式");
  assert.match(css, /--d-bg:/, "设计令牌已加 d- 前缀");
  const client = readSrc("client.js");
  assert.match(client, /\/api\/deepseek-usage\/panel\.css/, "客户端通过路由加载样式");
  assert.match(client, /function DeepMeterSeat[\s\S]*?injectSeatStyles\(\)/, "状态栏席位挂载时必须先注入本地布局样式");
  assert.match(client, /div:has\(> \[data-slot='sidebar\.footer\.action'\]\)\{flex-wrap:wrap\}/, "状态栏容器必须支持多入口换行");
  assert.match(css, /sidebar\.footer\.action/, "完整面板样式也定义状态栏布局");
  assert.doesNotMatch(client, /var CSS = "/, "样式不再内联进 bundle");
});

test("P2 防护：客户端 bundle ≤ 100KB（102400B）", () => {
  const size = readFileSync(join(SRC, "client.js")).length;
  assert.ok(size <= 102400, `client bundle 过大：${size}B > 102400B`);
});

test("P2 防护：顶部摘要与交互契约", () => {
  const code = readSrc("client.js");
  assert.doesNotMatch(code, /今日请求/, "顶部摘要已去掉今日请求");
  assert.match(code, /function fmtK\(/, "格子/坐标轴用紧凑数字");
  assert.match(code, /window\.setInterval/, "自动刷新不能遮蔽全局 setInterval");
  assert.match(code, /\[data-pop\]/, "弹层需要点击外部关闭");
  assert.match(code, /function ptitle\(/, "小时文案要给出 09:00–10:00 区间");
  assert.match(code, /function showTip\(/, "图表悬停明细");
  assert.doesNotMatch(code, /悬停查看每日金额及模型明细/, "去掉多余提示");
  assert.match(code, /repeat\(" \+ maxRows \+ ", minmax\(0, 1fr\)\)/, "按周矩阵列=周、行=月");
  assert.match(code, /d-week-cell" \+ \(current \? " d-current-period" : ""\)/, "当前周有呼吸灯标记");
  assert.match(code, /\(function \(day, cellStyle\) \{/, "日格逐格绑定闭包，点击落到正确的日期");
  assert.match(code, /\["tokens", "requests", "spend"\]\.filter\(function \(k\) \{ return seatCfg\[k\] && seatCfg\[k\]\.on; \}\)/, "顶部摘要与侧边栏勾选项一致");
  assert.match(code, /d-snap-scope/, "顶部摘要共用一个「今日」范围标签");
  assert.match(code, /" · 命中 " \+ hitRate/, "官方与本地 Tokens 卡都带命中率");
  assert.ok(!/d-dashboard-head[^\n]*renderScope/.test(code), "主视图不再出现本地范围切换");
  assert.doesNotMatch(code, /本地统计范围|全部 Provider/, "不再提供本地 Provider 切换");
  assert.match(code, /deepseekUsageRates/, "本地费率可编辑");
  assert.match(code, /暂无可用费率/, "无费率时显示明确文案");
  assert.match(code, /" · 占比 "/, "柱状图百分比标注为占比");
  assert.match(code, /seat: cfg/, "弹窗拿到当前侧边栏配置");
  assert.match(code, /function seatGlyph\(/, "侧边栏图标支持模板与上传");
  assert.match(code, /deepseekUsageSeat/, "侧边栏配置要落盘");
  assert.match(code, /120\]/, "自动刷新支持 120 秒");
  assert.match(code, /deepseekUsageInterval/, "自动刷新间隔要持久化");
  assert.match(code, /lastMonth/, "未来月份不再发起查询");
  assert.match(code, /输入（命中缓存）/, "Token 悬停带输入/输出拆分");
  assert.match(code, /children: "DeepSeek Usage"/, "全部关闭时回落到 DeepSeek Usage");
  assert.match(code, /row\.icon === undefined \? base\.icon : row\.icon/, "图标可以设为无");
  assert.match(code, /d-month-cell" \+ \(anchor\.year === nowYear/, "按月视图补呼吸灯");
  assert.match(code, /上半年 · 1–6 月/, "按周按上半/下半年分栏");
  assert.match(code, /yen: \["M7 4\.5/, "消费金额默认使用 ¥ 图标");
  assert.doesNotMatch(code, /面板卡片/, "指标卡不再提供开关");
  assert.match(code, /200 \* 1024/, "上传图标限制 200KB");
  assert.match(code, /calDaysAll/, "模型名单合并日历数据");
  assert.match(code, /"deepseek-flash": "DeepSeek-V4-Flash"/, "旧模型 id 归并到 V4-Flash");
  assert.match(code, /deepseek-v4-flash": "DeepSeek-V4-Flash"/, "v4-flash id 归并");
  assert.match(code, /上半年 · 1–6 月/, "按周分上半年/下半年");
  assert.match(code, /"第" \+ \(r \+ 1\) \+ "周"/, "周矩阵行标记");
  assert.match(code, /var box = popup \? popup\.getBoundingClientRect/, "提示框限制在弹窗内");
  assert.match(code, /background: "var\(--d-surface\)", color: "var\(--d-fg\)"/, "悬浮框浅色");
  assert.match(code, /setOpen\("settings"\);/, "选完图标立即收起选择面板");
});

test("P2 防护：客户端 bundle 无 JSX 语法、React 不打包", () => {
  const code = readSrc("client.js");
  // __ModuleLoader__.load 必须存在
  assert.ok(/window\.__ModuleLoader__\.load\(/.test(code), "必须是 __ModuleLoader__ bundle");
  // React 通过 require 获取（peer），不打包
  assert.ok(/require\(["']react["']\)/.test(code), "React 必须由宿主提供（peer require）");
  // 无 JSX 语法（<Component 形式）
  assert.ok(!/<[A-Z][a-zA-Z]*[\s/>]/.test(code), "禁止 JSX 语法（必须 jsx()/jsxs() 调用）");
  // 无 import 语句（手写 bundle 不用 ESM）
  assert.ok(!/^\s*import\s/m.test(code), "客户端 bundle 不应使用 ESM import");
});

test("R1 防护：上游接口域名只在 apiclient.js 出现；client.js 仅允许在用户可见链接里出现", () => {
  const serverFiles = ["index.js", "account.js", "cache.js", "http.js"];
  for (const f of serverFiles) {
    const code = readSrc(f);
    assert.ok(!/platform\.deepseek\.com/.test(code), `${f}: 上游接口域名只允许出现在 apiclient.js`);
  }
  const api = readSrc("apiclient.js");
  assert.ok(/platform\.deepseek\.com/.test(api), "apiclient.js 必须包含上游接口域名");
  // client.js 允许在 href 锚文本里出现该域名（供用户点击查看官方页），但不允许调用上游接口
  const client = readSrc("client.js");
  // 不允许 fetch 该域名（只有 /api/deepseek-usage/* 回环端点）
  assert.ok(!/fetch\(\s*["']https?:\/\/platform\.deepseek\.com/.test(client), "client.js 不得直接 fetch 上游域名");
});

test("R3 防护：429/5xx 指数退避", () => {
  const code = readSrc("apiclient.js");
  assert.ok(/backoffMs/.test(code), "apiclient 必须支持退避序列");
  assert.ok(/429/.test(code) && />=\s*500/.test(code), "必须重试 429 与 5xx");
  assert.ok(/UpstreamAuthError/.test(code), "401 必须有专用错误类型");
});

test("P3 防护：cache 必须有 TTL 与 in-flight 去重", () => {
  const code = readSrc("cache.js");
  assert.ok(/ttlMs/.test(code), "cache 必须有 TTL");
  assert.ok(/inflight/.test(code), "cache 必须有 in-flight 去重");
});

test("不登录：账号会话只从宿主记录读，不写任何东西", () => {
  const code = readSrc("account.js");
  assert.ok(/readRecord\(/.test(code), "必须从宿主 credentials 读记录");
  assert.ok(/deepseek-account-platform/.test(code), "必须读宿主已登录的 DeepSeek 账号记录");
  // 只读：不写宿主凭据、不写文件
  assert.ok(!/modifyRecord\(|deleteRecord\(|writeFileSync\(/.test(code), "不得写入任何凭据或文件");
});

test("不登录：客户端不含登录表单与登录请求", () => {
  const code = readSrc("client.js");
  assert.ok(!/["'`]\/login["'`]/.test(code), "客户端不得再调用 /login");
  assert.ok(!/type:\s*["']password["']/.test(code), "客户端不得再有密码输入框");
  assert.ok(!/userToken/.test(code), "客户端不得再让用户粘贴 userToken");
});