# 宿主契约备忘

记录 DeepMeter 在与 DSH 宿主对接时踩过的坑，方便后续维护。

## 服务名

DSH 宿主提供 HTTP 服务的服务名有两个，**两个都是真实存在的**：

- `webServer`：`@deepseek-ai/dsh-host-webserver@0.1.0-rc.6` 及之后版本用的名字。
- `httpServer`：`0.0.1-rc.x` 旧版本用的名字，npm `latest` tag 仍指向它。

DeepMeter 同时尝试两个名字，先到先用。**不要只问一个**——只问一个会导致在某个版本上面板静默 404。

## credentials 服务

- 凭据按引用存取：`creds.set(ref, value)` / `creds.get(ref)` / `creds.delete(ref)`。
- 引用句柄是字符串常量（`deepmeter.login` / `deepmeter.token`），不要把凭据明文放进 key。
- 生产环境宿主必须提供 credentials 服务；若宿主未提供，DeepMeter 用一个**仅本进程内存**的兜底（不落盘，进程退出即失）。

## 端点注册

- 服务名是 `webServer`（不是 `httpServer`）：`ctx.webServer.register({ kind: "exact", path, handler })`。
- 0.2.1-rc.3 里没有 `httpServer` 服务；代码用 `ctx.get(name)` 探测两个名字以兼容旧宿主。
- exact 路由的优先级高于 RPC 前缀，**位于 RPC 信任边界之外**——上游不会替我们校验调用方。
- 处理器必须自己做栅栏：校验 peer socket 地址（不可伪造）+ Host 头（第二条件）。详见 `src/http.js` 的 `screenRequest`。

## 客户端 bundle 加载

- 宿主在 `window.__ModuleLoader__` 上挂一个 `load({ id, factory })` 方法。
- factory 收到一个**同步** `require`，只能解析种子模块、shell 模块和已注册的工厂——**没有异步加载分支**。
- 这是文件必须保持单文件的根本原因：拆分会导致 require 解析失败。
- React 由宿主作为 peer 提供，bundle 不自带；样式手写注入。
- 客户端 bundle 的 `name` 在 `cordis.patch.yml` 里必须是**裸包名**（`deepseek-usage`），写成子路径（如 `deepseek-usage/plugin`）会导致宿主 client-module scanner resolve 失败、面板静默不加载。

## 主题

- 宿主在 `<html data-theme="dark|light">` 上切换主题。
- 客户端用 `MutationObserver` 监听 `data-theme` 属性变化，实时跟随。
- 全部颜色用 CSS 变量，亮/暗两套 `:root` / `html[data-theme='dark']` 定义。
## 两条踩过的坑（0.2.1-rc.3 实测）

### 1. 可选服务只能用 `ctx.get()`，不能用 `ctx.<name>`

Cordis 4 对**未在 `inject` 里声明**的服务做属性守卫，直接读会抛：

```
Error: cannot get property "commands" without inject
```

`export const optional = [...]` **不豁免**这条守卫。可选服务一律写成：

```js
const commands = typeof ctx.get === "function" ? ctx.get("commands") : undefined;
```

否则服务端条目会 `did not activate`，而且启动器只打印 `deepseek-usage: failed`，不含原因——
必须靠 `web boot` 的崩溃报告或本地复现才能定位。

### 2. 客户端 bundle **不要导出 `default`**

宿主加载器把模块的 `default` 当成插件本体。导出 `default: Panel` 会导致：

- `apply()` 永远不被调用（控制台看不到 apply 的日志）
- 客户端 fiber 卡在 `loading`，`__DSH_BOOT__` 校验报 `deepseek-usage: loading`
- 桌面端表现为 `web boot: 1 entry did not activate`，但**服务端 apply 是成功的**

正确形态（与所有宿主自带 bundle 一致）：

```js
module.exports.apply = apply;
module.exports.inject = inject;
```

`test/client-bundle.test.js` 里有对应的回归断言（`exports.default === undefined`）。

## sessionPersistence 服务（本地聚合）

本地模式依赖宿主可选的 `sessionPersistence`。它是**服务方法**，不是直接按 id load：

```js
const persistence = ctx.get("sessionPersistence"); // 软探测，可能 undefined
const snapshots = await persistence.list();        // [{ header, revision, sizeBytes }]
const reader = await persistence.open(id, "read"); // 只读，不取得写所有权
const { events } = await reader.read(0);           // offset 是 logical seq；0 = 全部
await reader.close();
```

- `list()` 的 `revision` 变化才需要重读；只变 `sizeBytes` 不代表事件内容变。
- 不要假设 `listSnapshots()` / `readFrom()`；那是早期原型的形状。`src/local.js`
  同时兼容两种，但产品路径以 `list()` / `open()` / `read()` 为准。
- 不要把 `zlib.zstdDecompressSync` 直接用在 `session.v4.jsonl.zstd` 上：日志是**多 frame 追加**，
  它只解第一帧。必须走宿主句柄。
- `sessionPersistence` 缺失时 `/api/deepseek-usage/local` 返回 503，官方模式不受影响。

插件端点（均走 loopback 栅栏）：

| 端点 | 作用 |
| --- | --- |
| `/api/deepseek-usage/status` | 账号状态 + `local.available` / 会话计数 |
| `/api/deepseek-usage/official?range=` | 官方账单口径 |
| `/api/deepseek-usage/local?range=&scope=&tz=&rates=` | 本地会话日志折叠；默认 `scope=all`；`rates` 覆盖费率；`cost` / `costMeta` 为当前费率估算 |
| `/api/deepseek-usage/reconcile?range=&scope=&tz=` | 官方 vs 本地 DeepSeek 路由对账，单侧失败时降级 |

## 本地验证手法（不重启 GUI）

desktop profile 被 Electron 独占，CLI 拒绝启动（"managed exclusively by the Electron application"）。
把 profile 连同 `node_modules` **整体复制**到隔离 `DSH_HOME`，再以另一个 profile 名启动：

```bash
rsync -a ~/.dsh/profiles/desktop/ /tmp/dsh-home/profiles/dmtest/
# package.json 的 name 改成 dsh-profile-dmtest，并去掉 llm-deepseek-account 的 models 配置
DSH_HOME=/tmp/dsh-home dsh --profile dmtest --port 0 --no-open
```

注意：`node_modules` 必须是**真实复制**，软链会让 pnpm 布局下的第三方包解析失败，产生假故障。
启动会打印带 token 的 URL，可用无头浏览器直接看渲染进程日志与 DOM。

## 复用宿主已登录的 DeepSeek 账号（本插件当前口径）

插件**不做登录**。宿主在 DSH 里登录 DeepSeek 账号后，凭据库里有一条：

```
~/.dsh/.credentials.yaml → records["deepseek-account-platform/default"]
  { kind: "grant", payload: { version, token, issuer } }
```

服务端用 `ctx.credentials.readRecord("deepseek-account-platform/default")` 读出来，
取 `payload.token`，带上头 `x-dsh-auth-token: <token>` 调官方平台：

| 用途 | 端点 | 说明 |
| --- | --- | --- |
| 余额 / 累计消费 | `/api/v0/users/get_user_summary` | `biz_data.normal_wallets / bonus_wallets / total_costs` |
| 用量（按时间窗） | `/api/v0/usage/by_api_key/amount?start=&end=&tz=` | `biz_data.series[].buckets[].usage[]`，`bucket` 由窗口长度决定 |
| 费用（按时间窗） | `/api/v0/usage/by_api_key/cost?start=&end=&tz=` | `biz_data.data[].series[].buckets[].cost`（字符串） |
| 旧版月度接口 | `/api/v0/usage/amount|cost?month=&year=` | **不再使用**：按 UTC 日切桶，东八区会少算每天 00:00–08:00 |

`start`/`end` 是 epoch 秒，且必须按 bucket 边界对齐（≤24h → 3600s，多日 → 86400s）；
`tz` 是时区偏移秒数（东八区 `28800`）。窗口长度决定粒度：一整天返回 24 个小时桶，
多天返回日桶。官方用量页对「今天」也是整天窗口（次日 0 点结束），未来小时为空桶。

插件内部的 `/api/deepseek-usage/official?range=` 接受 `today`、`yesterday`、`last7`、`last30`、`thisMonth`、`lastMonth`，并接受 `tz`（缺省用服务端时区）。`today`/`yesterday` 返回 `granularity: "hour"` + 24 个小时点；其余返回 `granularity: "day"` + 逐日点。`/api/deepseek-usage/summary` 也接受 `tz`，内部同样按本地日/小时桶取数。近 7 天与近 30 天均包含今天。

实测要点：

- `/api/v0/users/current` 在平台侧已 **404**，必须用 `get_user_summary`。
- 裸 `curl`（无浏览器 UA）会被 **429**；必须带 User-Agent + origin + referer。
- usage 的 `type`：`PROMPT_TOKEN` / `PROMPT_CACHE_HIT_TOKEN` /
  `PROMPT_CACHE_MISS_TOKEN` / `RESPONSE_TOKEN` / `REQUEST`。
- 只读：`account.js` 不写宿主记录、不写文件；token 不进出任何端点响应。
