# 本地聚合设计（Local Aggregation）

> 状态：**已实现** · 设计 2026-10-27 · 实现 2026-10-27 · 费用/费率编辑 2026-10-28
> 目标：在现有「DeepSeek 官方」数据源之外，增加一路**本地会话日志**聚合，
> 让面板能看见 DSH 实际跑了多少 Token、哪些模型/Provider 在用，并与官方账单对账。
>
> 核心结论：**不需要 tokenizer，也不需要抓包。** DSH 已经把每次模型调用
> 的 provider-reported `usage` 写进会话日志；本地聚合只是把这批事件按天/模型/Provider 折叠。
>
> 落地位置：`src/local-fold.js`（纯折叠）、`src/local.js`（会话扫描/缓存）、
> `src/reconcile.js`（官方 vs 本地对账）、`/api/deepseek-usage/local`、
> `/api/deepseek-usage/reconcile`，以及面板里的「本地 AI 聚合」数据源与对账条。

---

## 0. TL;DR

- 官方部分已经覆盖「platform 账号」的余额与账单；它**看不到** API Key 路由、中转站路由，
  也看不到官方接口尚未出账的最近几分钟。
- DSH 的会话日志在 `~/.dsh/sessions/<project>/<session>/session.v4.jsonl.zstd`，
  每个 `assistant/message` / `assistant/chunk` 都带 `usage`。
- 本机实测（截至 2026-10-27 22:06）：**126 个会话日志，113 个有 usage，
  84,356 条事件，11,024 次调用，1,538,204,798 Tokens**（9/26–10/27）。
- 官方近 30 天：**1,730,932,596 Tokens / 13,590 请求 / ¥154.11**；
  本地同窗口 **1,519,090,364 Tokens / 10,812 请求**，覆盖 **87.76%**。
  其中 10 月 1 日两边**逐 token 完全一致**（11,233,949），证明折叠口径正确。
- 现成开源实现：**TokenLedger**（已装但被禁用）、**dsh-usage-stats**、
  **dsh-token-metrics**；宿主内置 `@deepseek-ai/dsh-token-meter` 定义了权威口径。
- **实际采用**：在 DeepMeter 内新增 `src/local.js`，通过宿主 `sessionPersistence`
  读取事件并折叠；**不引入 SQLite、不依赖 TokenLedger、不自己解压 zstd**。
  UI 复用现有图表，新增「本地 AI 聚合」数据源与「官方 vs 本地」对账条。
- 首轮实测（隔离 DSH_HOME + 当时 126 个日志）：`/local` 首次 2.3s，
  返回 1.500B Tokens / 10,901 请求；`/reconcile` 在官方未登录时降级为本地数据，
  不整体 500。费用与费率编辑加入后 126 个自动化用例通过。

### 0.1 复核（2026-10-27 23:44）

在隔离 `DSH_HOME` 中重新用真实 127 个会话跑了一遍，并与上次官方读数对齐：

| 口径 | Tokens | 请求 | 说明 |
| --- | ---: | ---: | --- |
| 本地 last30 · 全部 Provider（当前 UI 口径） | 1,593,099,239 | 11,209 | 含 `gpt-6.1-sol` 19,222,851 tokens |
| 本地 last30 · `scope=deepseek`（仅对账） | 约 1.50B | — | 只含官方计费 Provider |
| 官方 last30（上次读数） | 1,730,932,596 | 13,590 | ¥154.11；官方端点未改 |
| 本地估算 last30（全部 Provider） | 1,593,099,239 | 11,209 | ¥126.93；gpt 未定价时不含其费用 |

结论：

- **折叠算术可复现**：10 月 1 日本地仍为 `11,233,949`，与官方逐 token 一致。
- **本地低于官方不是乘错倍数**：10 月 9 日官方 `93,126,049`，本地只读到
  `17,865,233`；差异来自本地日志覆盖不到的部分（已清理会话、其他客户端/API Key），
  本地不会凭官方总数去补造事件。
- **`scope=all` 可能高于官方**：10 月 17 日全部本地 `24,474,019`，其中
  `dsapi` 20,606,355、官方 account 3,867,664；中转用量不属于官方账单。
- 因此主视图统一显示「全部 Provider」；对账条只比较官方 DeepSeek 路由，避免把
  中转/OpenAI 混进官方账单口径。官方数据不准确时仍以官方为准，本地只是另一路观测口。

### 0.2 费用估算（2026-10-28）

在「本地只有 Token、没有金额」之上补了一层**可解释的估算**，不改官方口径：

| 项 | 值 |
| --- | --- |
| 费率表 | `src/pricing.js`；CNY/百万 token，与 CC Switch DeepSeek 行同步（USD × 7） |
| 峰谷 | 工作日 08:00–12:00、14:00–18:00（Asia/Shanghai）高峰；其余、周末、法定节假日低谷 |
| 计价 | 命中 / 未命中 / 缓存写入 / 输出四桶分别乘单价，`reasoningTokens` 不重复加 |
| 未定价模型 | `cost` 不计入、`costMeta.complete=false`，不按 0 元伪造；UI 显示「暂无费率」 |
| 自定义费率 | 面板「设置 → 本地费率」按模型增改；localStorage 保存，查询时作为 `rates` 参数传给服务端 |

用真实会话日志离线复核：

- 10 月 1 日官方 `¥0.36162416`，本地估算 `¥0.36`（同一批 11,233,949 Tokens）；
- 近 30 天本地全部 Provider `1,593,099,239 Tokens`、估算 `¥126.93`；官方
  `1,792,927,900 Tokens / ¥153.99`。差额来自本地覆盖率，不是把单价乘错；
  为 `gpt-6.1-sol` 添加费率后，同一批数据估算约 `¥165.51`；
- UI 因此显示 `≈¥`，官方账单仍是权威口径。

---

## 1. DSH 到底用了多少 Token

### 1.1 全量（所有 Provider，9/26–10/27）

| 指标 | 数值 |
| --- | ---: |
| 会话日志 | 126（有 usage 113，子代理会话 14） |
| 事件数 | 84,356 |
| usage 样本 / 调用次数 | 11,024 |
| 未命中输入（`inputTokens`） | 22,332,815 |
| 缓存命中（`cacheReadTokens`） | 1,506,763,165 |
| 缓存写入（`cacheWriteTokens`） | 0 |
| 输出（`outputTokens`） | 9,108,818 |
| **合计** | **1,538,204,798** |

> 缓存命中占 97.96%。Agent 多步循环里，prompt 前缀被反复复用，这是正常形态；
> 不代表「输入很少」。计费输入 = 未命中 + 命中 + 写入。

### 1.2 按模型

| 模型 | Tokens | 请求 | 占比 |
| --- | ---: | ---: | ---: |
| deepseek-flash | 1,210,523,586 | 8,691 | 78.7% |
| deepseek-v4-flash | 269,577,478 | 1,749 | 17.5% |
| deepseek-v4.1-flash | 33,496,029 | 370 | 2.2% |
| gpt-6.1-sol（中转） | 19,222,851 | 126 | 1.2% |
| deepseek-v4-pro | 4,385,335 | 44 | 0.3% |
| 其他（MiniMax / 免费路由） | 999,519 | 44 | 0.1% |

DeepSeek 系模型合计 **1,517,982,428（98.69%）**。

### 1.3 按 Provider

| Provider | Tokens | 请求 | 性质 |
| --- | ---: | ---: | --- |
| deepseek-official | 825,549,015 | 6,798 | 官方 OAuth（当前） |
| deepseek-account | 361,984,149 | 1,854 | 官方账号（历史路由名） |
| deepseek | 289,122,395 | 1,752 | 官方 API Key（历史路由名） |
| dsapi | 40,772,537 | 428 | 中转（ai.ailink1.com） |
| openai | 19,222,851 | 126 | 中转 |
| minimax-cn | 620,602 | 34 | 中转 |
| modlens-deepseek | 554,332 | 22 | 中转 |
| our-free-model / mini | 378,917 | 10 | 免费/实验路由 |

### 1.4 与官方账单对照（近 30 天，9/28–10/27）

| 来源 | Tokens | 请求 | 费用 |
| --- | ---: | ---: | ---: |
| 官方 `usage/amount` | 1,730,932,596 | 13,590 | ¥154.11 |
| 本地会话日志（全部） | 1,519,090,364 | 10,812 | — |
| 覆盖率 | **87.76%** | 79.6% | — |

> 87.76% 是「本地全部 Provider」对「官方账户」的覆盖，其中含 `dsapi/openai` 等中转。
> 若只算官方计费路由（`deepseek-official` + `deepseek-account` + `deepseek`），
> 近 30 天约 1.458B，覆盖率约 **84.2%**；剩余差额主要来自其他客户端/机器。

几个有代表性的一天：

| 日期 | 官方 | 本地 | 本地/官方 | 说明 |
| --- | ---: | ---: | ---: | --- |
| 10-01 | 11,233,949 | 11,233,949 | **100.0%** | 只有 DSH 用这个账号，逐 token 一致 |
| 10-14 | 2,834,221 | 2,834,221 | **100.0%** | 同上 |
| 10-15 | 84,873,571 | 84,873,571 | **100.0%** | 同上 |
| 10-17 | 3,867,789 | 24,474,019 | 632.8% | 本地含 `dsapi` 中转 20.6M，官方账号不包含 |
| 10-09 | 93,126,049 | 17,865,233 | 19.2% | 官方账号还有其他客户端/机器在用 |
| 10-27 | 111,832,370 | 137,364,805 | 122.8% | 含中转；仅 `deepseek-official` 为 113.5M |

**结论**：本地不是官方的替代，而是互补。官方是「账户全量、延迟约 5 分钟」；
本地是「本机 DSH、实时、能看到 API Key/中转」。两者放在一起才对得上账。

---

## 2. 数据存在哪

### 2.1 权威来源：会话日志

```
~/.dsh/sessions/
  --Users-sdiwen-DeepMeter--/
    session-0e1cce37-.../
      session.v4.jsonl.zstd
      session.lock
```

- 每行一个 `SessionEvent`（v4 JSONL，zstd 压缩，**多个 frame 追加**）。
- 头部一行 `{"type":"session","version":4,"id":...,"cwd":...,"createdAt":...}`。
- usage 出现在两类事件上：

```jsonc
// 1) 成功调用的最终样本
{"type":"assistant/message","seq":159,"time":1793109593220,
 "data":{"turn":1,"step":12,
   "usage":{"inputTokens":2715,"outputTokens":658,
            "cacheReadTokens":10624,"cacheWriteTokens":0,"totalTokens":13997},
   "message":{"role":"assistant","source":{
     "kind":"model","provider":"deepseek-official","model":"deepseek-flash"}}}}

// 2) 流式 usage（请求失败也可能只留下它，但仍然计费）
{"type":"assistant/chunk","data":{"turn":1,"step":12,
  "chunk":{"type":"usage","usage":{...}}}}

// 3) chunk 没有身份时，回退到最近一次请求头
{"type":"request/header","data":{"header":{"config":{
  "provider":"deepseek-official","model":"deepseek-flash"}}}}
```

> 不要自己用 `zlib.zstdDecompressSync()` 解压：它只解**第一个 frame**。
> 实测一个 186 行的事件日志只读出 1 行。必须走宿主 `sessionPersistence`，
> 或 `zstd -dc` / 流式解码（仅用于排查）。

### 2.2 宿主提供的读取口

`@deepseek-ai/dsh-session-persistence` 的 `ctx.sessionPersistence`：

| 方法 | 用途 |
| --- | --- |
| `list()` | `[{ header, revision, sizeBytes }]`，不解析全量日志；`revision` 变了才需要重读 |
| `open(id, "read")` | 只读句柄；不取得写所有权，不阻塞正在运行的会话 |
| `handle.read(offset, length?)` | 读 `seq >= offset` 的事件；初读传 `0`，不传 `length` 即读到尾 |
| `handle.close()` | 释放句柄；`read` 句柄不落盘 |
| `stat(id)` / `flush()` | 其他场景（本实现不需要） |

`@deepseek-ai/dsh-token-meter`（宿主内置，`ctx.tokenMeter`）还提供
`tokenUsage` **session projection**：每个会话累计的
`{ uncachedInputTokens, outputTokens, cacheReadTokens, cacheWriteTokens }`。
它适合「某会话总共用了多少」，**不提供按天/按模型拆分**，所以不能单独满足面板；
但可以用作交叉校验。

### 2.3 其他 token 存储（不要依赖）

| 路径 | 是什么 | 状态 |
| --- | --- | --- |
| `~/.dsh/token-usage/usage-YYYY-MM-DD.jsonl` | 旧插件 `token-usage-stats` 的逐请求记录 | 插件在 `cordis.patch.yml` 里 `disabled: true`；只有 9/26 的 58 条 |
| `~/.dsh/tokenledger.sqlite` | TokenLedger 的 SQLite rollup | TokenLedger 被禁用；`session_rollups`/`checkpoints` 均为 0 |
| `~/.dsh/token-ledger/ledger.json` | 另一个账本插件 | totals 全 0，未使用 |
| `~/.dsh/storages/token-monitor/token-monitor.db` | token-monitor 插件 | 与 DSH 会话日志无直接关系 |
| `~/.dsh/token-usage-pricing.json` | DeepSeek 峰谷价（CNY） | 可复用为费用估算 |

这些文件只能证明「有人做过」，**不能作为聚合输入**：格式私有、可能过期、
且 TokenLedger 当前没有产出。权威事实仍是会话日志。

---

## 3. 折叠口径（必须与 DSH 一致）

对齐 `@deepseek-ai/dsh-token-meter` 的 `tokenUsage` projection：

1. **四个桶互斥**：`uncachedInput`、`cacheRead`、`cacheWrite`、`output`。
   `reasoningTokens` 是 `outputTokens` 的子集，**只展示，不再加**。
   总 Tokens = 四个桶相加。
2. **同一 `(turn, step)` 的重复样本是替换，不是累加**。
   后来的样本要先把旧样本从**原归属的日期/模型**里减掉，再加上新样本。
3. **同时收 `assistant/chunk` 和 `assistant/message`**。
   请求报出 usage 后失败，永远等不到 `assistant/message`，但供应商已经计费。
4. **chunk 没有 provider/model**，回退到最近一次 `request/header.data.header.config`；
   `assistant/message` 用 `data.message.source`。归不上的记 `unknown`，不猜。
5. **日期按宿主本地时区切**；官方接口用 `tz` 秒偏移，本地必须用同一个 `tz`，
   否则东八区每天 00:00–08:00 会错位。
6. **只读计数与标识符**：token 数、模型名、provider 路由名、时间、turn/step。
   不读 prompt、tool 参数、响应正文，不写文件。

---

## 4. 开源项目对照

| 项目 | 作用 | License | 对 DeepMeter 的价值 |
| --- | --- | --- | --- |
| [TokenLedger](https://github.com/zh667/TokenLedger) | DSH 插件：`sessionPersistence` 扫描 + 按天/站点/模型折叠 + SQLite + DeepSeek 官方/中转余额 + 峰谷价 | MIT | **最完整的参考实现**；`src/usage.js` 的折叠逻辑可直接借鉴（保留 NOTICE） |
| [dsh-usage-stats](https://github.com/Ychris12138/dsh-usage-stats) | TokenLedger 的上游折叠实现 | MIT | 双来源采样、替换语义、路由归属的原始出处 |
| [dsh-token-metrics](https://github.com/hugoyee75-cmyk/dsh-token-metrics) | 按模型/供应商/项目/来源/账号/日期拆分，带缓存命中率与趋势 | — | 维度设计与 UI 参考；同样走 `sessionPersistence` |
| [`@deepseek-ai/dsh-token-meter`](https://www.npmjs.com/package/@deepseek-ai/dsh-token-meter) | 宿主内置 `ctx.tokenMeter` + `tokenUsage` projection | 宿主包 | **权威口径**；README 明确写了替换语义与四桶互斥 |
| [ccusage](https://github.com/ryoppippi/ccusage) | Claude Code 本地 JSONL 用量的 CLI/汇总 | MIT | 本地日志聚合的产品形态参考，不是 DSH 代码 |
| [tiktoken](https://github.com/openai/tiktoken) / [DeepSeek tokenizer](https://github.com/deepseek-ai/DeepSeek-V3) | BPE 分词器 | MIT / 模型许可 | **本设计不需要**；只在「发请求前预估」时有意义，且不是计费口径 |

> 一句话：**DeepMeter 的本地聚合不“算” token，只“读” provider 报的 usage。**
> 真正要抄的开源实现是 TokenLedger / dsh-usage-stats 的折叠，而不是 tiktoken。
> DSH 自己的 `tokenMeter` 对 context pressure 用的是「4 字符 ≈ 1 token」启发式，
> 也不是计费口径。

TokenLedger 已在本机：
`~/.dsh/profiles/desktop/node_modules/dsh-tokenledger`（v0.1.0），
但 `cordis.patch.yml` 里 `id: tokenledger` 是 `disabled: true`，DB 为空。
**不建议**让 DeepMeter 去读它的 SQLite 或 HTTP 端点——那是跨插件的隐式依赖，
且它的核心维度是「中转站」，不是「官方 vs 本地」。

---

## 5. 方案设计

### 5.1 总体结构

```
浏览器面板
  ├─ /api/deepseek-usage/official   （现有，官方账单）
  ├─ /api/deepseek-usage/local      （新增，本机会话日志）
  └─ /api/deepseek-usage/reconcile  （新增，两边按天对齐）
        │
        ├─ official: 现有 apiclient + credentials + cache
        └─ local:    sessionPersistence.list()
                      → open(id, 'read').read(0) → close()
                      → foldSession(events) → per-session rollups
                      → 查询时按 range/tz/scope 求和
```

### 5.2 模块

| 文件 | 职责 |
| --- | --- |
| `src/local.js` | `createLocalSource({ persistence, logger, config })`；`sweep()`、`query(range, tz, scope)`；折叠入口 |
| `src/local-fold.js` | 纯函数：`foldSession(events, { tz })`、`dayKey/hourKey`、桶运算。便于单测，不碰宿主 |
| `src/reconcile.js` | 纯函数：官方 points + 本地 points → 对齐、覆盖率、差额、caveats |
| `src/http.js` | 注册 `/local`、`/reconcile`；复用 `screenRequest` 回环栅栏 |
| `src/index.js` | 探测 `sessionPersistence`；构造 local source；传给 routes |
| `src/client.js` | 启用「本地 AI 聚合」；按 mode 取数；标签/余额/费用切换；对账条 |
| `NOTICE` | 若借鉴 TokenLedger/dsh-usage-stats 代码，按 MIT 保留版权与来源 |

### 5.3 扫描与缓存

**不做 SQLite。** 本机 113 个有 usage 的会话，内存里每个会话一张
`day → model/provider → buckets` 小表，查询时求和即可；规模到几千会话再考虑落库。

```
sweep():
  snapshots = await persistence.list()
  for snapshot of snapshots:
    id = snapshot.header.id
    if state[id]?.revision === String(snapshot.revision): skip
    reader = await persistence.open(id, 'read')
    { events } = await reader.read(0)                  // 全量重折，简单且不会有减账错误
    await reader.close()
    next = foldSession(events, { tz })
    states[id] = { revision, ...next }
  remove states for vanished session ids
```

- **整会话重折**而不是增量加减：一个会话最多几十万条事件，重折成本可控；
  避免「先减旧样本再加新样本」在跨日/跨模型时算错。TokenLedger 用增量 + SQLite
  是因为它要长期存全量；DeepMeter 的源日志本身就能重建。
- 首次 sweep 约 1–2 秒（84k 事件）；之后只重读 revision 变化的会话。
- 请求级缓存：`sweep()` 结果保留 30 秒 + in-flight 去重；**不启动后台定时器**，
  仍然只在打开面板 / 切范围 / 手动刷新时触发。
- 单个会话读取失败：计数 + 日志，保留旧 state，不影响其他会话。

### 5.4 端点

#### `GET /api/deepseek-usage/local?range=&tz=&scope=&rates=`

`range` 与官方一致：`today|yesterday|last7|last30|thisMonth|lastMonth`；
另支持 `from=YYYY-MM-DD&to=YYYY-MM-DD`（日历跨月用）。
`scope`：`all`（默认，所有 Provider）/ `deepseek`（只算官方计费路由，供对账使用）。
`rates`：可选，URL-encoded JSON 费率覆盖表；格式同 `config.pricing.models`。

返回形状**尽量对齐 official**，前端图表无需改数据模型：

```jsonc
{
  "ok": true, "source": "local", "version": "0.1.0",
  "range": "last30", "window": { "from": "2026-09-28", "to": "2026-10-27" },
  "granularity": "day",
  "points": [{
    "date": "2026-10-01",
    "hit": 11188608, "miss": 14504, "output": 30837,
    "requests": 20,
    "models": [{ "model": "deepseek-flash", "tokens": 11233949, "requests": 20 }]
  }],
  "totals": { "hit": 0, "miss": 0, "output": 0, "tokens": 0, "requests": 0 },
  "models": [{ "model": "deepseek-flash", "tokens": 0, "requests": 0 }],
  "providers": [{ "provider": "deepseek-official", "tokens": 0, "requests": 0, "scope": "official" }],
  "coverage": {
    "sessions": 126, "sessionsWithUsage": 113, "failed": 0,
    "firstAt": 1790403113236, "lastAt": 1793109969024,
    "scope": "all", "lastSweepAt": 1793109969024
  },
  "cost": 0.36,
  "costMeta": {
    "currency": "CNY", "estimated": true, "complete": false,
    "pricedTokens": 11233949, "unpricedTokens": 0, "unpricedModels": [],
    "peakIntervals": [[480, 720], [840, 1080]], "holidayCount": 60
  },
  "latencyNote": "本地会话日志，实时；费用按当前费率估算，实际以官方账单为准"
}
```

- `today`/`yesterday` 返回 `granularity: "hour"` + 24 个小时点，和官方一致。
- `cost` 是所有**已定价** token 的估算金额；有未定价模型时只报部分金额，
  `costMeta.complete=false` 并列出 `unpricedModels`。官方账单仍是权威口径。
- 不返回任何 prompt/tool 内容。

#### `GET /api/deepseek-usage/reconcile?range=&tz=&scope=`

```jsonc
{
  "ok": true,
  "window": { "from": "2026-09-28", "to": "2026-10-27" },
  "official": { "available": true, "tokens": 1730932596, "requests": 13590,
                "cost": 154.11, "hit": 1683571456, "miss": 37425070, "output": 9936070 },
  "local":    { "available": true, "tokens": 1519090364, "requests": 10812,
                "hit": 0, "miss": 0, "output": 0 },
  "coverage": 0.8776,
  "delta": { "tokens": 211842232, "requests": 2778 },
  "points": [{
    "date": "2026-10-01",
    "official": { "tokens": 11233949, "requests": 20, "cost": 1.1 },
    "local":    { "tokens": 11233949, "requests": 20 },
    "deltaTokens": 0, "coverage": 1
  }],
  "caveats": [
    "官方为账户全量，本地仅本机 DSH 会话",
    "中转站路由（dsapi/openai 等）不计入官方 platform 账单",
    "本地不含已被清理的会话；历史可能偏低",
    "官方账单最多延迟约 5 分钟"
  ]
}
```

- 官方未登录时：`official.available=false, official.error="unauthenticated"`，
  本地照常返回，HTTP 200；面板显示「未连接官方，仅本地」。
- 对账固定用 `scope=deepseek` 只算官方计费路由，避免把中转用量算进「官方差额」；
  主视图不再切换 scope。

### 5.5 Provider 归类

默认配置（可覆盖）：

```yaml
deepseek-usage:
  local:
    officialProviders: ["deepseek-official", "deepseek-account", "deepseek"]
    sweepTtlMs: 30000
    maxSessions: 5000
```

更稳的做法（第二期）：像 TokenLedger 的 `discovery.js` 一样，用
`ctx.llm.listConfigurableProviders()` + `ctx.settings` 读每条路由的 `baseURL`，
按 origin 判断是否是 `api.deepseek.com` 官方端点；`baseURL` 缺失且是宿主自带
DeepSeek 路由的也算官方。把归类结果缓存到 sweep 里，配置变化时重算。
第一期先用显式列表，简单、可测、不会误判。

### 5.6 与现有插件的兼容

- `sessionPersistence` 用 `optional` 声明 + `ctx.get("sessionPersistence")` 探测，
  **不放进 `inject`**：老宿主没有这个服务时，官方模式必须仍然可用。
- 没有 persistence 时：`/local` 返回
  `{ ok:false, error:"local-unavailable" }`；`/status` 里 `local.available=false`；
  面板把「本地 AI 聚合」置灰并提示升级 DSH。
- 不改 `/official`、`/summary`、`/status` 的既有字段；只做**新增**，
  避免破坏现有测试与前端。
- 客户端 bundle 上限 100KB：新增逻辑主要在服务端；客户端只加取数分支和少量 JSX。
  如果超限，对账表可以放到详情弹窗按需渲染，不要新增图表库。

---

## 6. UI 设计

本地模式与原官方模式共用同一套面板、图表和指标卡布局，只切换数据口径和文案；
入口是 header 的「选择数据来源」菜单，不再有「尚未接入」的禁用态。

### 6.1 数据源切换

- `state.mode`：`official`（默认，保持现状）/ `local`；写入 `localStorage.deepseekUsageMode`。
- 面板与侧边栏是独立 slot，通过 `deepseek-usage:source` 事件同步：
  侧边栏按当前 mode 请求 `/official?range=today` 或 `/local?range=today&scope=all`
  （带上已保存费率），不再固定请求官方。
- 点击后：
  - `loadView()` / `loadToday()` 改走 `/local`；
  - header 状态从「已连接官方」变为「本地统计中」；
  - 消费金额卡显示 `≈¥`（按当前费率估算），未定价时显示「暂无可用费率」并可点击编辑；
  - 余额卡读取官方账户余额（与本地日志范围无关），官方未登录时显示 `—`；
  - 页脚从「DeepSeek 官方数据 · 延迟约 5 分钟」改为
    「本地会话日志 · 实时 · 仅统计本机 DSH」。
- `useEffect` 依赖加 `mode`，切模式立即重取。

### 6.2 指标卡与文案

| 位置 | 官方模式 | 本地模式 |
| --- | --- | --- |
| 指标卡 1 | Tokens | `≈Tokens`（日志覆盖可能不完整；caption 带缓存命中率） |
| 指标卡 2 | 消费（CNY） | 消费 `≈¥`（当前费率估算；未定价模型会注明，无费率时显示「暂无可用费率」） |
| 指标卡 3 | API 请求 | API 请求 |
| 指标卡 4 | 余额（CNY） | 官方账户余额；未登录时 `—` |
| 图表标题 | 各模型消费金额 | 各模型 Token 用量 |
| 日历标题 | 官方账单 | 本地用量 |
| 脚注 | 官方 · 延迟 5 分钟 | 本地 · 实时 |

本地消费金额是**估算**，不是官方出账；卡片用 `≈` 和「按当前费率估算」标明。
未定价模型时只累加已定价部分，并在 caption 写「部分模型未定价」；没有可用费率时
显示「暂无可用费率」，不把 0 当真实消费。余额来自官方账户（账号级数据），
本地模式不再显示「本地无余额」。

### 6.3 对账条（关键差异化）

本地模式下，在指标卡上方加一条可折叠的「对账条」：

```
官方 1.73B · 本地 1.53B · 覆盖 88.6%   [查看差额]
```

- 点击打开一个小表：日期 / 官方 / 本地 / 差额 / 覆盖率；
- 差额为正（官方更多）时提示「可能来自其他客户端或已清理会话」；
- 差额为负（本地更多）时提示「本地含中转/API Key 路由，官方账号不含」；
- 今天的数据标注「官方延迟约 5 分钟，本地实时」。

### 6.4 Provider 范围

不再提供「DeepSeek 官方 / 全部 Provider」切换。本地模式固定包含本机所有 Provider，
因此昨天/近 30 天能直接看到 `gpt-6.1-sol`、`MiniMax-M3` 等中转模型；对账条仍只比较
DeepSeek 官方路由。未定价模型显示「暂无费率」，可在「设置 → 本地费率」补费率。

### 6.5 空态 / 错误态

- 没有 persistence：按钮置灰，tooltip「当前宿主不支持本地会话读取」。
- 没有会话：显示「本机还没有 DSH 会话记录」。
- 读取失败：保留上一次数据 + 顶部轻提示，不阻塞官方模式。
- 官方未登录 + 本地模式：正常显示本地，对账条显示「官方未登录」。

---

## 7. 正确性验证

### 7.1 已完成的实测

| 检查 | 结果 |
| --- | --- |
| 10-01 本地 vs 官方 | 11,233,949 = 11,233,949，20 请求 |
| 10-14 / 10-15 | 完全一致 |
| 10-17 本地 > 官方 | `dsapi` 中转 20.6M 解释了差额 |
| 10-09 官方 > 本地 | 官方账号有其他客户端/机器在用 |
| 四桶相加 | `input + cacheRead + output = totalTokens`（抽样逐条一致） |
| 多 frame zstd | `zstdDecompressSync` 只读到第 1 行 → 必须走宿主 API |

### 7.2 新增测试

`test/local-fold.test.js`（纯函数）：

1. `assistant/message` 单样本 → 桶正确；
2. `assistant/chunk` + 同 `(turn,step)` 的 `assistant/message` → 替换而非累加；
3. 只有 chunk、没有 message（失败请求）→ 仍然计数；
4. chunk 无身份 → 回退到最近 `request/header`；
5. 跨天替换 → 从旧日期减、记到新日期；
6. `reasoningTokens` 不重复计入总数；
7. 时区 `tz=28800` 的日界；
8. `scope=deepseek` 排除 `dsapi/openai`；
9. 24 小时桶（today/yesterday）；
10. 空事件 / 损坏事件 → 不崩，计数为 0。

`test/local-source.test.js`（假 persistence）：

1. 首次 sweep 读全量；
2. revision 不变 → 不重读；
3. revision 变化 → 整会话替换，总数不重复；
4. 单会话读取抛错 → 其他会话照常，failed 计数；
5. 会话消失 → 从 state 移除。

`test/reconcile.test.js`：

1. 逐日对齐；缺失日期补 0；
2. 官方未登录 → `official.available=false`，本地仍返回；
3. 覆盖率分母为 0 → `null` 而不是 `Infinity`；
4. 差额正负号与 caveat 对应。

`test/http-local.test.js` 增补：`/local`、`/reconcile` 的回环栅栏、方法限制、
local-unavailable 分支。

### 7.3 验收标准

- 官方模式行为**零变化**，现有 126 个用例全绿。
- 本地模式下，10-01 这类「只有 DSH 用账号」的日期与官方逐 token 一致。
- 首屏本地数据 ≤ 2s（首次 sweep），后续 ≤ 100ms（revision 未变）。
- 不新增运行时依赖；不写文件；不读 prompt；bundle 仍 ≤ 100KB。
- 所有端点仅回环 GET，复用 `screenRequest` 双校验。

---

## 8. 实施顺序

| 阶段 | 内容 | 预估 |
| --- | --- | --- |
| P0 | `local-fold.js` + `local.js` + `/local` + 单测 | 1–2 天 |
| P1 | 客户端启用本地模式、标签/余额/费用切换、today 小时桶 | 1 天 |
| P2 | `/reconcile` + 对账条 + Provider 过滤 | 1 天 |
| P3 | 可选：CSV 导出、按项目/子代理拆分；费率估算已提前完成 | 按需 |

P0 完成后就可以在面板里看到本地数据；P2 才是「官方 vs 本地」的完整价值。

---

## 9. 风险与边界

| 风险 | 处理 |
| --- | --- |
| 宿主 `sessionPersistence` API 在 rc 间变动 | 现行 `list()` + `open(id, 'read')` + `read(0)` + `close()`；同时兼容测试用 `listSnapshots()` / `readFrom(id, 0)`；`ctx.get` 软探测；失败降级 |
| 会话日志被清理 | 本地历史偏低；对账条显示覆盖率与差额，不假装完整 |
| 官方是账户全量，本地是本机 | 明确标注口径；对账只对齐官方计费路由，中转单列 |
| 时区/日界 | 统一用请求的 `tz`；测试覆盖东八区 00:00–08:00 |
| 多 frame zstd | 不自己解压，走宿主；排查时才用 `zstd -dc` |
| 同一 step 重复上报 | 替换语义；先减旧再记新 |
| Provider 归类漂移 | 第一期显式列表 + 配置覆盖；第二期按 baseURL origin 自动发现 |
| 大日志内存 | 逐会话读取、只保留折叠结果；不保留 events |
| 面板体积 | 逻辑在服务端；客户端只加分支；bundle 超限时把对账表放进详情弹窗 |

---

## 10. 已定决策

1. **本地模式范围**：固定显示全部 Provider（含 `gpt-6.1-sol` 等中转），不再做
   scope 切换；对账条单独用 DeepSeek 官方路由，避免口径混淆。
2. **对账 UI**：顶部对账条 + 「查看差额」详情弹窗；不新增第三个 tab。
3. **本地费用**：可显示**估算金额**，但必须标注。服务端按模型/峰谷逐桶计价并返回
   `costMeta`；客户端显示 `≈¥`，未定价模型不混入，无费率显示「暂无可用费率」；
   费率可在面板增改；余额取官方账户，官方账单是权威口径。
4. **默认模式**：保持 `official`（零行为变化）；本地作为可选数据源，选择会持久化，
   侧边栏今日指标跟随当前数据源。
5. **包结构**：先内聚在 DeepMeter，不抽独立包；稳定后再考虑复用。

### 10.1 实现清单

- `src/local-fold.js`：纯函数折叠，四桶互斥；同 `(turn, step)` 替换；chunk 回退、
  无来源记 `unknown`；按 `tz` 切小时/日。
- `src/local.js`：`list()` → 按 `revision` 跳过未变会话 → `open(id, 'read')` →
  `read(0)` → `close()`；只保留折叠结果，不保留 events；30s TTL、并发去重、
  `maxSessions` 上限。
- `src/pricing.js`：DeepSeek 模型费率、峰谷判定、逐桶费用估算、未定价标记。
- `src/reconcile.js`：官方/本地逐日、逐小时对齐；`delta = official - local`；
  任一侧不可用时 `coverage: null`，并给出 caveat。
- `src/http.js`：`/local`、`/reconcile`；沿用 loopback 栅栏、24 个月回看、
  800 天范围上限；自定义范围的对账从官方月度 `summary` 拼日数据。
- `src/client.js`：数据源菜单「本地 AI 聚合」、全部 Provider 固定范围、费率编辑器、
  与官方同布局的四张指标卡（消费 `≈¥` 估算 / 官方余额）、Token 图表、对账条与差额弹窗、
  本地日历；数据源与费率落盘并同步侧边栏今日指标。
- `test/local-fold.test.js`、`test/local.test.js`、`test/pricing.test.js`、
  `test/reconcile.test.js`、`test/http-local.test.js`、`test/source-toggle.test.js`：
  折叠语义、现行/旧宿主 API、全部 Provider、revision 缓存、补空桶、峰谷/节假日计价、
  自定义费率、未定价模型、路由降级、侧边栏数据源跟随。

---

## 附录 A：一次性核对命令

> 仅用于排查；不要在插件运行时依赖 `zstd` CLI。

```bash
# 单个会话的 usage 事件（注意多 frame，必须用 zstd -dc）
zstd -dc ~/.dsh/sessions/--Users-sdiwen-DeepMeter--/session-*/session.v4.jsonl.zstd \
  | node -e '
    let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{
      for(const l of s.split("\n")){if(!l)continue;const e=JSON.parse(l);
        if(e.type==="assistant/message"&&e.data?.usage)
          console.log(new Date(e.time).toISOString(),e.data.message.source.provider,
                      e.data.message.source.model,JSON.stringify(e.data.usage));}
    })'
```

```bash
# 官方近 30 天汇总（需要 DSH 已登录）
curl -s "http://127.0.0.1:60839/api/deepseek-usage/official?range=last30" \
  | node -e '
    let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{
      const j=JSON.parse(s);let t=0,r=0,c=0;
      for(const p of j.points){t+=p.hit+p.miss+p.output;r+=p.requests;c+=p.cost}
      console.log({tokens:t,requests:r,cost:c.toFixed(2)});
    })'
```

## 附录 B：参考实现入口

- TokenLedger 折叠：`~/.dsh/profiles/desktop/node_modules/dsh-tokenledger/src/usage.js`
- TokenLedger 扫描：同目录 `src/plugin.js` 的 `sweep()`
- 宿主口径：`@deepseek-ai/dsh-token-meter` 的 `lib/types/usage-projection.d.ts`
- 宿主读取：`@deepseek-ai/dsh-session-persistence` 的
  `list()` / `open(id, 'read')` / `handle.read(offset, length)` / `handle.close()`；
  `list()` 的 snapshot 带 `header`、`revision`、`sizeBytes`，`revision` 变化才需重读
- 本实现入口：`src/local-fold.js`、`src/local.js`、`src/reconcile.js`
