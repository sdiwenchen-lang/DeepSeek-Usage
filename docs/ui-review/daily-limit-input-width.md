# 每日限额输入框被挤到无法使用 → 设置面板统一固定尺寸（1.0.1 → 1.0.3）

## 现象

「显示设置 → 每日限额」里 Token 上限的数字输入框只剩十几到四十像素，几乎点不进去、也看不清数值；同一行的单位下拉和面板其它按钮正常。用户反馈：「每日限额 对应 token 限额 设置不了」。

## 复现与测量

在桌面 profile 的克隆里用 Playwright 打开真实面板（窗口 1280×900），读取 `getBoundingClientRect()`：

| 版本 | 设置面板宽 | 左导航列 | 限额行宽 | 输入框宽 | 结果 |
|---|---|---|---|---|---|
| 1.0.1 | 290px | 100px | 318px（超出面板 53px） | 41.9px | 行溢出被 `overflow:hidden` 裁掉，单位下拉右侧被切 |
| 1.0.2 | 360px | 84px | 254px（贴合面板） | 115.9px | 完整可见，可点击、可输入 |
| 1.0.3 | 290px（与其它分页一致） | 122px（与单位合成一个控件） | 196px | 122px | 数字右对齐、单位作后缀，尺寸与其它分页相同 |

1.0.1 的行宽 318px 来自 `.d-budget-settings` 的隐式网格列按 min-content 撑开，而 `.d-fx-input` 的基础规则是 `flex: 1 1 0; width: 0; min-width: 0`——网格列比容器宽 53px，输入框又被压缩到 0 再按剩余空间分配，于是只剩几十像素。

## 修复

`src/panel.css`（1.0.2 修宽度，1.0.3 把尺寸统一成固定一块）：

- 固定框架（`.d-settings-panel` + `-seat` + `-budget` 同一条规则）：`width: 290px; height: 240px; grid-template-columns: 92px minmax(0, 1fr)`——就是改版前的外观/定价页尺寸，五个分页共用，切换分页不改尺寸、没有过渡。
- 窄屏 `≤560px`：同一框架改为 `min(290px, 100vw - 24px)`，居中定位。
- 限额行改为两行：`.d-budget-settings .d-fx-label { flex: 1 1 100%; }`，数字框 `flex: 1 1 0` 拿满剩余宽度，单位下拉固定 64px；行内边距收到 `4px 6px`，保证红色超限提示出现时内容仍不越界（实测 `scrollHeight 195 = clientHeight 195`）。
- 底部说明收敛成一行「达到上限即熔断后续调用。」，统计不完整时才追加「统计不完整，按已知用量判断。」。
- `.d-budget-settings`：显式 `grid-template-columns: minmax(0, 1fr)`，不再让隐式列按 min-content 溢出。
- `.d-budget-settings .d-fx-input`：`flex: 1 1 96px; width: auto; min-width: 96px; text-align: right`。
- `.d-budget-settings .d-fx-row`：`min-width: 0; max-width: 100%`。
- `≤560px`：限额行 `flex-wrap: wrap`，输入框 `flex: 1 1 100%`，窄屏也不会被压成一条缝。

守护：`test/panel-css.test.js` 断言上述宽度/网格/换行/过渡规则存在（116 项测试通过）。

## 证据

![每日限额行在 1.0.2 下的版式](daily-limit-input-width.png)

![290×240 固定面板，限额行标签在上、输入框 92px（1.0.3）](daily-limit-fixed-panel.png)

![输入 1000 时的红框与红字提示，内容仍不越界](daily-limit-fixed-panel-invalid.png)

验证方式：本地开发 profile 用 `dsh plugin --profile dshfix add /Users/sdiwen/IdeaProjects/DeepSeek-Usage` 软链仓库源码，重启 `dsh --profile dshfix --port 0 --no-open`，Playwright 真实鼠标依次点开五个分页，逐个读取面板 `getBoundingClientRect()` 与子元素越界情况：

```
appearance 392→360×240 无越界   seat 360×240 无越界   pricing 360×240 无越界
budget     360×240 无越界        refresh 360×240 无越界
```

（上表为最终 360 版；同一脚本在 392 版也全部无越界，最终取 360 以免外观页过空。）

## 未覆盖

真实 Electron 桌面包（「更新」按钮那条流水线）没有在本机重放，只验证了同一 profile 的 web 宿主；两者共用同一份 `panel.css` 与面板 DOM。


## 1.0.3 的排版重做

改版前的限额页是「标签 + 输入框 + 单位」硬挤在一行，290px 面板里只能给数字 41.9px。1.0.3 按下面的结构重排：

```
Token 上限                                   ← 11px / 500 / muted，独占一行
┌──────────────────────────────┬──────────┐
│                     15.511   │  亿  ▾   │   ← 金额右对齐 13px mono；单位是同一个控件里的后缀
└──────────────────────────────┴──────────┘
消费上限
┌──────────────────────────────┬──────────┐
│                     ¥555.00  │   CNY    │
└──────────────────────────────┴──────────┘
Token 81.89M · 消费 ¥2.72                    ← 今日已用，11px mono
达到上限即熔断后续调用。                      ← 说明 / 超限警告 / 熔断警告共用这一行
```

对应军规：

- **规则 03 / 09**：层级靠「11px 灰标签、13px 等宽数值、10px 灰色说明」三档字号加字重，不靠放大；标签与控件间距 4px、两组之间 10px，组间距明显大于组内间距。
- **规则 05**：去掉页内重复的「每日限额」标题——左侧导航已经高亮同名分页，省下的 26px 换成「今日 Token · 消费」的对账行。
- **规则 15**：超限时同时改文字（「每种单位最多 999，超出不会保存」）、整组描边与数字颜色，不只靠颜色。
- **规则 19**：删除行外框，只保留金额控件自身的 1px 边框；分组靠留白与 10px 间距，而不是画格子。
- **规则 25**：聚焦时金额与单位作为一个控件整体点亮（`border-color` + 2px 柔光环），失焦即自动保存，状态在底部一行回显。

## 证据

![改版后的每日限额](daily-limit-panel.png)

![聚焦态：金额与单位整组点亮](daily-limit-panel-focus.png)

![超限态：整组转红并给出可读提示](daily-limit-panel-invalid.png)

实测：面板 290×240，限额行宽 196px，金额控件 122px + 单位 54px；正常 / 聚焦 / 超限 / 熔断四种状态都没有溢出（`scrollHeight = clientHeight`）。
