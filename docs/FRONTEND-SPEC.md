# DeepMeter 前端设计规范(开发交接)

**日期**:2026-10-27(样式已按 v2 稿重做)· **原型**:工作区 `deepseek-usage-popup 2.html` · **用途**:后续扩展开发对齐本规范。

> 样式表不再手写:`src/panel.css` 由 `node scripts/build-panel-css.mjs` 从原型抽取生成 —— 类名统一 `d-` 前缀、令牌统一 `--d-` 前缀、全部规则收在 `.d-usage` 作用域内(样式注入宿主文档,不能有全局 reset)。改样式请先改原型,再重新生成。

---

## 1. 弹窗容器与滚动

| 项 | 值 |
|---|---|
| 宽度 | `min(100%, 800px)` |
| 高度 | `min(100vh - 32px, 680px)` |
| 外层 | `.d-usage` 为 `position:fixed` 遮罩,居中承载弹窗;小屏由 @media 接管 |
| 溢出 | `overflow: auto`(内容超出出滚动条,不截断) |
| 圆角 | `--radius-lg` = 12px |
| 投影 | `0 1px 2px fg@4%, 0 12px 32px fg@10%`(无发光) |
| header | `position: sticky; top:0; z-index:5; min-height:60px; padding:12px 16px; border-bottom:1px solid var(--border); background:var(--surface)` |
| 内容区 | `.popup-content { padding:16px }` |

---

## 2. 设计令牌(亮 / 暗两套)

`.d-usage` 定义亮色;`@media (prefers-color-scheme: dark)` 内 `.d-usage` 覆盖暗色;宿主用 `[data-theme="dark"]` 时同一套令牌再生效。所有令牌带 `--d-` 前缀(如 `--d-bg`),避免与宿主变量撞名。

### 基础色

| 令牌 | 亮色 | 暗色 | 用途 |
|---|---|---|---|
| `--bg` | `#F5F6F8` | `#1D1E24` | 画布 / 卡片内嵌填充 |
| `--surface` | `#FFFFFF` | `#26272E` | 弹窗面板 / 菜单 / 弹层 |
| `--fg` | `#1F2329` | `#E8EAF0` | 主文字 |
| `--muted` | `#5B6472` | `#9BA3B0` | 次要文字 |
| `--border` | `#E4E6EB` | `#373A43` | 边框(仅输入控件/菜单用) |
| `--accent` | `#4D6BFE` | `#6E86FF` | 图形 / 图表 / 图标(随主题变) |
| `--accent-strong` | `#3A4FD4` | `#6E86FF` | 小号强调文字 / 主按钮底 |
| `--accent-hover` | `#2E40BC` | `#7E94FF` | hover 态 |
| `--on-accent` | `#FFFFFF` | `#0F1117` | 主按钮文字 |
| `--success` | `#15803D` | `#3DD68C` | 成功 |
| `--danger` | `#D0342C` | `#F87171` | 危险 |
| `--heat` | `#16A34A` | `#22C55E` | 热力图主色(固定绿,不随主题) |
| `--heat-deep` | `#15803D` | `#15803D` | 热力图最深档 |
| `--accent-soft` | `color-mix(srgb, accent 9%, transparent)` | `accent 14%` | 弱强调底(派生,勿改) |
| `--fg-soft` | `color-mix(srgb, fg 4%, transparent)` | `fg 6%` | 弱分隔底(派生,勿改) |

### 多 AI 分类色板(图表分段,不随主题变)

| 令牌 | 亮色 | 暗色 |
|---|---|---|
| `--ai-1` | `#4D6BFE` | `#6E86FF` |
| `--ai-2` | `#0E9F6E` | `#34D399` |
| `--ai-3` | `#D97706` | `#FBBF24` |
| `--ai-4` | `#6E56CF` | `#9B8CFF` |
| `--ai-5` | `#64748B` | `#94A3B8` |

模型色绑定:`LOCAL_MODELS` / `DS_MODELS` 每项 `color: 'var(--ai-N)'`,JS `seg.style.background = ent.color`。

### 字体 / 字号 / 间距 / 圆角

- `--font-display` / `--font-body`:全 sans(`-apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', system-ui, sans-serif`),**禁用衬线**。
- `--font-mono`:仅数字(`ui-monospace, 'JetBrains Mono', 'SF Mono', Menlo, monospace`)。
- 字号以组件内联样式为准:正文 14px、指标值 20px、标签 12px、辅助 11–12px。
- 圆角:`--d-radius-sm:8`(控件)、`--d-radius:10`(卡片/输入)、`--d-radius-lg:16`(浮层/弹窗)。
- 字重:仅 400 / 500 / 600(禁用 650/680)。
- 辅助文字最小 11px(禁 9-10px 又小又灰)。

---

## 3. 主题色机制(5 主题,默认蓝)

### 令牌覆盖

在 `.d-usage` 令牌块之后定义 `.d-usage[data-theme="..."]` 变体,**仅覆盖 `--accent` 系列**,`--heat` / `--ai-N` 不随主题。亮 / 暗各一套(暗色 accent 提亮一档)。

| data-theme | 名称 | 亮 accent / strong / hover | 暗 accent |
|---|---|---|---|
| `blue`(默认) | DeepSeek 蓝 | `#4D6BFE` / `#3A4FD4` / `#2E40BC` | `#6E86FF` |
| `orange` | 官方橙 | `#F86A2E` / `#EA580C` / `#C2410C` | `#FB923C` |
| `green` | 极客绿 | `#0E9F6E` / `#059669` / `#047857` | `#34D399` |
| `purple` | 典雅紫 | `#7C3AED` / `#6D28D9` / `#5B21B6` | `#A78BFA` |
| `red` | 商务红 | `#DC2626` / `#B91C1C` / `#991B1B` | `#F87171` |

### 状态与切换

- `theme`(默认 `'blue'`),持久化到 `localStorage.deepseekUsageTheme`(形如 `{name:"blue"}`)。
- 主题属性落在面板根节点 `.d-usage` 的 `data-theme` 上,只影响面板,不影响宿主。
- 色块点击:写状态 + 落盘,React 重渲染即生效。

### 选择器 UI

设置面板「主题颜色」组,`.theme-swatches` 内 5 个 `.theme-swatch`(`role="radiogroup"` / `role="radio"`):
- 圆形 28×28,`background: var(--swatch)`(inline `--swatch:#...`)。
- 选中态:`box-shadow: 0 0 0 2px surface, 0 0 0 4px swatch` + `.swatch-check` 白色勾(`opacity 0→1`)。
- hover `scale(1.1)`;focus-visible 外圈。

---

## 4. Header(顶栏)

结构(`header.popup-header.row-between`,flex space-between):

```
brand-lockup | header-snapshot | settings-field(conn-status + 齿轮 + 设置面板)
```

- **brand-lockup**:`.brand-mark` 32×32 圆角 8 方块,`background: var(--accent)` + `color: var(--on-accent)`(闪电 SVG);`.brand-name`「DeepMeter」14px/600;`.brand-subtitle` 11px muted,**被 `state.displayName` 覆盖**(默认「用量」)。
- **header-snapshot(今日快照条)**:填充 header 中部,与 brand 用 `border-left:1px solid var(--border)` 分隔,`padding-left:16px; margin-left:8px; gap:20px`。
  - 两个 `.snap-item`:`.snap-label`(11px muted「今日 Token / 今日消费」)+ `.snap-val`(15px/600 mono,`id="snapTokens"` / `id="snapSpend"`)。
  - 中间 `.snap-divider` 1×20px 竖线。
  - JS 在 `syncControls` 末尾用 `daySpend(TODAY)` + `fmtTokens` 填充;**`<720px` 隐藏整条**。
- **conn-status(状态胶囊)**:在 settings-field 内、齿轮左。`.conn-status` 胶囊 `background: var(--accent-soft); color: var(--accent-strong)`,含 `.dot` + `b#connStatusText`。
  - 文案:`本地统计中`(local)/ `已连接官方`(official);official 时加 `.official` 类(绿底 `color-mix(success 12%)`)。
- **settings-btn(齿轮)**:`.icon-btn` 36×36;点击 `aria-expanded` 切换,`[aria-expanded="true"] svg { transform: rotate(45deg) }`。

---

## 5. 设置面板(popover)

`.settings-panel`:`position:absolute; top:calc(100%+8px); right:0; z-index:18; width:280px; max-height:min(70vh,520px); overflow:auto; padding:14px; background:var(--surface)(不透明白); border:1px solid var(--border); border-radius:12px; box-shadow:0 12px 32px fg@14%; animation:panel-in .2s`。

分组 `.settings-group`(组间 `border-top`,首组无边):

| 配置 | 控件 | 绑定 |
|---|---|---|
| 显示模式 | `.mode-switch.compact` segmented(官方/聚合) | 复用 `data-mode` → `state.mode`,切 `official`/`local` |
| 主题颜色 | `.theme-swatches` 5 色块 | `state.theme` → `applyTheme()` |
| 显示名称 | `input#displayName`(默认「用量」,maxlength 20) | `state.displayName` → `.brand-subtitle`(插件 tab 显示名) |
| 显示项 | 4 个 `.settings-toggle`(蓝色 toggle) | 见下 |

**显示项 4 开关**(input checkbox + `.toggle-track` + `.toggle-text`):

| id | 文案 | 默认 | 作用 |
|---|---|---|---|
| `showTokens` | Token 用量 | 开 | 隐/显 `.metric[data-od-id="metric-tokens"]` |
| `showSpend` | 今日消费 | 开 | 隐/显 `.metric[data-od-id="metric-spend"]` |
| `showBalance` | 余额 | 开 | `$('balanceStrip').hidden = !showBalance || mode!=='official'` |
| `showNames` | 标签名称 | 开 | `document.body.classList.toggle('hide-names', !showNames)`(图例/明细只留数值) |

toggle 轨道 34×20,滑块 16px,`input:checked + .toggle-track { background: var(--accent) }`。

`applyDisplayPrefs()` 统一应用,在 `syncControls` 末尾 + 各 input change 时调用。

关闭:点齿轮 toggle / 点 `.settings-field` 外(`document click`)/ ESC。

---

## 6. 页面结构

- `nav.page-tabs`(role=tablist):`用量趋势`(data-page=detail)/ `用量日历`(data-page=calendar),选中态底部 2px accent 下划线。
- `#pageDetail` / `#pageCalendar`,切换 `[hidden]`;`state.page` 记录。
- **登录页已删除**(聚合模式无需登录,数据源切换移至设置);**「导出数据」按钮已删除**(页脚不再渲染导出)。

---

## 7. 指标卡(metrics)

`.metrics`:`grid-template-columns: repeat(3, minmax(0,1fr)); gap:8px; margin-top:16px`。
- 今日消费 / API 请求 / Token 消耗 三卡。
- `.metric`:`background: var(--bg)`(浅灰内嵌,**无边框**),圆角 10,`padding:12px 10px`。
- `.metric-label` 11px muted + 12px accent 图标;`.metric-value` 18px/600 mono;`.metric-unit` / `.metric-caption` 11px muted。

---

## 8. 热力图(用量日历)

`.heatmap`:`grid-template-columns: repeat(7, minmax(0,1fr)); gap:5px; margin-top:12px`(按日,7 列=一周)。
- `.heat-cell`:`aspect-ratio:1; border-radius:5px; font:10px mono`;背景按 `data-level` 0–4:
  - 0:`color-mix(heat 6%, surface)`
  - 1/2/3:`heat` 逐级加深
  - 4:`var(--heat-deep)` + `color:#fff`
- `.heat-cell.today`:`border-color: var(--accent-strong); font-weight:700`。
- 图例 `.legend-swatch` 同色系。
- **热力图固定绿色阶,不随主题色变化**。

---

## 9. 日历「按周」规则

`week-grid` 从固定 6 列 grid 改为 flex column + 每月独立动态列行:
- 动态计算 `lastWeek`:从第 6 周往前找首个有数据的周,决定该月显示几列。
- **第 6 周无数据不显示**(不留空列/空行)。
- 不存在的周用透明占位保持对齐;整月无数据整行不渲染。

---

## 10. 图表

### stacked-chart(各模型消费金额堆叠柱；今天按小时，其余按日)
`.stacked-chart`:`display:flex; align-items:flex-end; gap:3px; height:158px; border-bottom:1px solid var(--border)`;背景网格线 `linear-gradient(to bottom, border@60% 1px, transparent 1px); background-size:100% 33.333%`。
- `.stack-col`:flex column 倒序堆叠,`animation: bar-rise .5s backwards`。
- `.stack-seg`:JS 设 `style.background = ent.color` + `style.height = (value/maxTotal)*100%`。
- hover:`.stacked-chart.has-hover .stack-col:not(.is-hovered) { opacity:.35 }`。
- 图例 `.model-legend-item` 色块用 `--ai-N`。

### mini-chart(各模型 Token / API 请求)
`.mini-chart-grid`:`grid-template-columns:1fr; gap:12px; margin-top:16px`。
- `.mini-bar`:`background: var(--accent)`(纯色,勿再混 surface 变淡);hover `var(--accent-hover)`。
- 折线:`stroke: var(--accent)`。
- 坐标轴 / 网格线淡色,无粗轴线。

### 动画关键帧
`bar-rise`:from `{opacity:.2; transform:scaleY(0)}` → to `{opacity:1; scaleY(1)}`;`cell-in` scale .82→1;`panel-in` translateY(-4px)→0 + opacity;`page-in` opacity。均 `.2–.5s`,fill `backwards`/`both`。

---

## 11. 状态管理(state)

```js
const state = {
  connected: false, mode: 'local', page: 'detail',
  dim: 'day', off: 0,
  preset: 'today',
  theme: 'blue',                    // 主题色
  start: iso(TODAY), end: iso(TODAY),
  tdView: new Date(...),
  hidden: new Set(), previousFocus: null,
  // 运行时动态添加:displayName / showTokens / showSpend / showBalance / showNames
};
```

后续开发建议:把 `displayName` / `showTokens` / `showSpend` / `showBalance` / `showNames` / `theme` 显式初始化进 `state`,并接入 `chrome.storage.local` 持久化。

---

## 12. 待办 / 未完成项

| 项 | 说明 |
|---|---|
| API 请求次数动态化 | 数据层,当前 mock;UI 结构已留位 |
| `src/panel.css` 与原型同步 | 已完成:由 `scripts/build-panel-css.mjs` 生成,令牌、`[data-theme]` 主题、header-snapshot、设置面板、指标卡「无边框浅灰填充」全部对齐 v2 稿 |
| 设置面板样式重构 | 用户反馈「太突兀」,待更克制(灰底/大圆角/宽松) |
| 筛选控件缩小 | 日期/模型筛选 36px 高 → 28px,胶囊风 |
| 各模型 Token 图模仿官方 | 参考 DeepSeek 官方用量页:圆角柱、无轴线、淡网格、加大间距 |
| 持久化 | 所有设置项(主题/名称/显示开关/模式)接 `chrome.storage.local` |

---

## 13. 相关文件

- 原型:`deepseek-usage-popup 2.html`(工作区根目录)
- 样式生成器:`scripts/build-panel-css.mjs` → `src/panel.css`
- 预览/截图脚本:`scripts/preview-client.mjs`(用真实 bundle + 假数据渲染)
- Host 契约:`docs/HOST-CONTRACT.md`
