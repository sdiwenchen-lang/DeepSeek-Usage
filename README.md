# DeepSeek Usage

> DeepSeek 官方账单 + 本地 DSH 会话日志，两种口径的 Token / 用量看板 —— DeepSeek Harness（DSH）插件。
> 点侧边栏「用量」弹出居中大弹窗：默认走官方账号（不登录、不落盘凭据），可切到本地聚合看 DSH 实际跑了多少。

---

## 它是什么

DeepMeter 把用量数据搬进 DSH，写代码间隙瞄一眼就知道今天烧了多少、余额还剩多少、官方账单和本地日志差多少。

- **总额**：充值余额、累计消费（官方账单口径）。
- **用量趋势**：所选范围内的消费金额、API 请求次数、Token 消耗，各模型 Token 堆叠柱状图，
  以及请求次数 / Tokens 两张走势图。
- **本地 AI 聚合**：直接读 DSH 会话日志里 provider 上报的 `usage`，按天/小时折叠；
  默认包含本机所有 Provider（DeepSeek、中转、OpenAI/Codex 等），不再有
  「DeepSeek 官方 / 全部 Provider」切换。数据源选择会持久化，侧边栏「今日」指标
  跟随当前数据源；本地模式的 Token 和消费金额都标 `≈`（日志覆盖可能不完整，
  金额再按当前费率估算，不声称与账单等价），费率可在面板里按模型增改；
  余额仍读取官方账户余额，和本地日志范围无关。
- **官方 vs 本地对账**：同一范围内并排显示官方 DeepSeek 账单、本地 DeepSeek
  路由、覆盖率、差额；本地主视图含全部 Provider，对账条只比较 DeepSeek 路由，
  避免把中转/OpenAI 混进官方账单口径；官方未登录时降级为只显示本地，不整体报错。
- **本地费用估算**：按模型分别计价，缓存命中 / 未命中 / 缓存写入 / 输出四个桶不混算；
  工作日 08:00–12:00、14:00–18:00（北京时间）用高峰价，其余时段、周末和法定节假日
  用低谷价。未定价模型如实标记并显示「暂无费率」，不按 0 元计入；面板内可增改费率。
- **用量日历**：当月每日 Token 热力图，5 级深浅，可翻月。
- **筛选**：时间范围（今天 / 昨天 / 近 7 天 / 近 30 天 / 本月 / 上月）、模型多选。

今日数据按小时展示（和官方用量页同源：`usage/by_api_key` + 本地时区桶）；样式已固化在 `src/panel.css`，类名使用 `d-` 前缀、令牌使用 `--d-` 前缀，全部规则收在 `.d-usage` 作用域，不污染宿主。

## 数据从哪来（不需要登录）

插件**没有登录表单、不接收 token、不落盘凭据**。每次取数时按需读一次宿主的凭据记录：

```
records["deepseek-account-platform/default"].payload.token   // kind: "grant"
```

再带 `x-dsh-auth-token` 头调官方平台的内部接口（抓包确认，非公开 API）：

| 用途 | 端点 |
| --- | --- |
| 余额 / 累计消费 | `GET /api/v0/users/get_user_summary` |
| 用量明细（逐日逐模型） | `GET /api/v0/usage/amount?month=&year=` |
| 费用明细 | `GET /api/v0/usage/cost?month=&year=` |

所以在 DSH 里登录账号 = 这里有数据；在 DSH 里退出账号 = 这里显示「未检测到 DeepSeek 账号」。
上游请求统一带浏览器 UA 与 `x-app-version`，否则平台会回 429。

## 本地聚合（不需要 tokenizer）

本地模式通过宿主可选的 `sessionPersistence` 服务读会话日志，不自己解压 zstd、不建 SQLite、
不依赖 TokenLedger：

```text
persistence.list()                    # 每个会话的 header + revision + sizeBytes
persistence.open(id, 'read')          # 只读句柄，不取得写所有权
handle.read(0)                        # 全部事件
handle.close()
```

折叠口径直接采用 DSH 的 provider-reported usage：

- 四桶互斥：`cacheReadTokens` → 命中、`inputTokens` → 未命中、
  `cacheWriteTokens` → 缓存写入、`outputTokens` → 输出；`reasoningTokens` 是输出子集，不重复加。
- 同一 `(turn, step)` 的最终 `assistant/message` **替换** chunk 样本，不累加。
- Provider/model 取 `message.source`，缺失时回退最近一次 `request/header`，再缺失记 `unknown`。
- 只缓存折叠结果，不保留事件；`revision` 未变不重读；30s TTL、并发去重。

本地看到的不是官方账单的全集：官方包含所有客户端/机器，本地只含本机 DSH 会话；
本地还会包含中转/API Key 路由，也会因日志清理而缺失历史。所以对账条同时显示覆盖率和 caveat，
不假装两边 1:1。

## 安装

DeepMeter 以**本地 link** 方式装进 DSH profile（`~/.dsh/profiles/<profile>/`）：

```jsonc
// package.json → dependencies
"deepseek-usage": "link:/Users/sdiwen/IdeaProjects/DeepSeek-Usage"
```

```yaml
# cordis.patch.yml → dsh.profile.bundles
- id: deepseek-usage
  name: deepseek-usage
```

改完**重启 DSH** 生效：客户端 bundle 在启动时一次性加载。装好后侧边栏多出一枚
「DeepSeek Usage · 用量」按钮，点开即是面板。

> 刚启动的那一屏可能还没有第三方插件的入口：桌面端窗口先于宿主插件图加载，客户端会
> 因 “Host release changed” 暂停插件更新。**刷新一次页面（⌘R）**即可看到入口，之后一直保留。`package.json` 的 `dsh.bundle.patch` 指向
`cordis.patch.yml`，宿主加载 bundle 时自动应用补丁。

### 可配置项（都有默认值，可不写）

```yaml
- id: deepseek-usage
  name: deepseek-usage
  config:
    xAppVersion: "0.1.0"                # 发给上游的 x-app-version
    requestTimeoutMs: 10000             # 单次上游请求超时
    cacheTtlMs: 600000                  # 缓存 TTL（10 分钟）
    lookbackMonths: 24                  # 月份回看上限（覆盖整年）
    retryBackoffMs: [1000, 2000, 4000]  # 429 / 5xx 退避序列
    local:
      sweepTtlMs: 30000                 # 本地会话日志扫描 TTL
      maxSessions: 5000                 # 单次扫描上限
      officialProviders:                # 算作「官方计费路由」的 provider
        - deepseek-official
        - deepseek-account
        - deepseek
      pricing:                          # 可选：本地费用估算
        enabled: true                   # false 时本地消费金额显示「暂无可用费率」
        # models:                       # 覆盖默认表（CNY / 百万 token）
        #   deepseek-v4-pro:
        #     peak:    { miss: 9, hit: 0.3, cacheWrite: 0, output: 27 }
        #     offpeak: { miss: 4.5, hit: 0.15, cacheWrite: 0, output: 13.5 }
        # peakIntervals: [[480, 720], [840, 1080]]   # 分钟，默认 08:00–12:00 / 14:00–18:00
        # holidays: ["2026-10-01", ["2026-10-01", "2026-10-07"]]
```

默认定价表覆盖 `deepseek-flash` / `deepseek-v4-flash` / `deepseek-v4.1-flash` /
`deepseek-v4-flash-vision-exp` 与 `deepseek-v4-pro`，并为 `deepseek-chat` /
`deepseek-reasoner` / V3 系列保留平价。Flash / Pro 的高峰/低谷价就是面板里
预填的两行（命中 0.04/0.02、0.30/0.15；未命中 2/1、9/4.5；输出 8/4、27/13.5，
单位元/百万 token）。价格与 CC Switch 的 DeepSeek 行同步；峰谷按北京时间（默认 08:00–12:00、14:00–18:00，可在面板费率里查看）。
未知模型（例如本机 `gpt-6.1-sol`）不会计费，`costMeta` 会报告
`complete: false` 与 `unpricedModels`；在面板「设置 → 本地费率」里补一行即可。

## 插件自有端点

全部只监听回环地址，并做双重校验（peer socket 必须是 `127.0.0.1` / `::1`，Host 头也必须是回环），
任一不满足返回 403。

| 端点 | 作用 |
| --- | --- |
| `GET /api/deepseek-usage/status` | 数据源状态：是否检测到账号、数据源引用、是否降级 |
| `GET /api/deepseek-usage/summary?year=&month=` | 余额 + 指定月份逐日逐模型用量与汇总（日历页数据） |
| `GET /api/deepseek-usage/official?range=today\|yesterday\|last7\|last30\|thisMonth\|lastMonth` | 所选范围的账户摘要、金额 / 请求数 / Tokens 汇总及逐日逐模型序列；自动加载跨月所需数据 |
| `GET /api/deepseek-usage/local?range=…&scope=all\|deepseek&tz=&rates=` | 本地会话日志的逐日/逐小时 Token、模型、Provider、缓存命中率、coverage 与 `cost` / `costMeta`（当前费率估算）；默认 `scope=all`，`rates` 可覆盖费率；也接受 `from=&to=` 自定义范围 |
| `GET /api/deepseek-usage/reconcile?range=…&scope=…` | 同一范围官方 vs 本地：覆盖率、差额、逐日/逐小时对账；官方未登录或本地不可用时降级一侧 |
| `GET /api/deepseek-usage/panel.css` | 面板样式表（约 50KB，独立下发，见「体积预算」） |

## 代码结构

```
DeepSeek-Usage/
├── src/
│   ├── index.js        # Cordis 入口：name / inject / optional / apply，装配依赖、注册命令
│   ├── http.js         # 回环端点、loopback 栅栏、summary/official/local/reconcile 聚合与缓存
│   ├── apiclient.js    # 唯一允许出现 platform.deepseek.com 的地方：端点、鉴权头、字段映射、重试
│   ├── account.js      # 只读宿主 credentials 里的 DeepSeek 账号（60s 缓存、并发去重）
│   ├── cache.js        # TTL + in-flight 去重
│   ├── local-fold.js   # 纯折叠：usage 事件 → 小时/route 桶；同 (turn, step) 替换
│   ├── local.js        # 本地数据源：sessionPersistence 扫描、revision 缓存、范围聚合
│   ├── pricing.js      # DeepSeek 费率表、峰谷判定、逐桶费用估算
│   ├── reconcile.js    # 官方 vs 本地对账 payload
│   ├── client.js       # 浏览器半边：__ModuleLoader__ bundle，React 组件与图表（纯 SVG）
│   └── panel.css       # 面板样式（由 /panel.css 下发）
├── cordis.patch.yml    # bundle 补丁（安装入口）
└── package.json
```

服务端是纯 Node 标准库 + 宿主注入的 `credentials` / `sessionPersistence`，无运行时依赖、无构建步骤；
前端 bundle 手写 `__ModuleLoader__.load({ id, factory })`，React 由宿主作为 peer 提供。

## 开发检查

```bash
npm run bundle:check   # 客户端 bundle 体积上限 100KB（102400B）
```

几个非显然、改代码前必须知道的约束：

- **客户端 bundle 只能导出 `apply` / `inject`**。导出 `default` 会让宿主 fiber 卡在 loading，整个 web 启动失败。
- **bundle 上限 100KB**，而面板样式有 ~50KB。所以样式走 `/api/deepseek-usage/panel.css` 单独下发，
  客户端只注入一个 `<link>`；把 CSS 塞回 `client.js` 会直接超限。
- **`inject` 里只声明真用到的服务**：`credentials` 必须；`webServer` / `httpServer` / `commands` /
  `sessionPersistence` 是可选的，用 `ctx.get()` 探测——Cordis 4 下直接读 `ctx.commands` 会抛错。
  `sessionPersistence` 缺失时 `/local` 返回 503，官方模式不受影响。
- **本地聚合不要在插件里解压 zstd**：会话日志是多 frame 追加，`zlib.zstdDecompressSync` 只读第一帧；
  一律走宿主句柄的 `read(0)`。
- **上游字段名会变**，映射集中在 `apiclient.js` 的 `FIELD_MAP`，改一处即可。

## 体积与性能预算

| 项 | 预算 | 实测 |
| --- | --- | --- |
| 客户端 bundle | ≤ 102400B | ~99.5KB |
| 面板样式 | 独立下发 | ~50KB |
| 面板不可见时 | 零请求、零定时器 | 满足 |
| 图表渲染 | 纯 SVG，≤ 5ms | 满足 |
| 本地 126 个会话首次折叠 | < 5s | ~2.3s |
| 本地增量折叠 | 只重读 revision 变化的会话 | 满足 |

## 安全与隐私

- 凭据只经宿主 credentials 服务按引用读取，**不写文件、不下发浏览器、不进日志**。
- token 只出现在 `x-dsh-auth-token` 请求头，不进 URL。
- 自有端点仅回环，`screenRequest` 双校验 peer socket 与 Host。
- 无后台轮询：只有打开面板 / 切换月份或范围 / 手动刷新时才取数，10 分钟 TTL + in-flight 去重。

## 已知限制

- 依赖 platform.deepseek.com 的内部接口，官方无承诺，接口变动需改 `apiclient.js`。
- 只覆盖 platform 账号（即 DSH 已登录的那个），API Key 用量不在范围内。
- 热力图固定当月，跨年回看以月为单位。

## License

MIT，见 [LICENSE](./LICENSE)。
