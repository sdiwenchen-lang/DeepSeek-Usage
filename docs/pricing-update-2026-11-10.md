# 2026-11-10 定价与包体积核验

本轮新增三个费率条目，快照由 139 增至 142。其余条目继续使用原 cc-switch.db/model_pricing 快照，不能将本次快照日期理解为 142 个模型均已重新核对官方价目。

| 模型 ID | 输入 | 输出 | 缓存命中 | 缓存写入 |
| --- | ---: | ---: | ---: | ---: |
| deepseek-v4-flash-vision-exp | 0.30 | 1.20 | 0.006 | 0 |
| kimi-k3.1-pro | 2 | 10 | 0.20 | 2 |
| kimi-k3.1-pro-highspeed | 4 | 20 | 0.20 | 4 |

单位为 USD / 百万 Tokens。DeepSeek 沿用项目的高峰价，不按峰谷重算历史日志；Kimi 缓存写入为默认 5 分钟 TTL，1 小时 TTL 的写入价分别为 4 和 8，需要用户按实际 Provider 配置调整。现有四通道日志没有 TTL 分项，不自动识别混合 TTL、批量或地区差价。

来源：

- [DeepSeek 官方模型与价格](https://api-docs.deepseek.com/quick_start/pricing/) 明确 deepseek-v4-flash-vision-exp / deepseek-v4-flash 仍可调用，按当前 deepseek-flash 价格计费。
- [Kimi 官方 USD 价格](https://platform.kimi.ai/docs/pricing/chat) 的普通文本抓取遗漏动态表格；本次读取同页原始 HTML 中的定价组件，确认 Pro 为 2/10/0.20/2/4，Highspeed 为 4/20/0.20/4/8（输入、输出、命中、5m 写入、1h 写入）。
- [Kimi 官方缓存说明](https://platform.kimi.ai/docs/guide/context-caching.md) 确认默认 5m、四类输入互斥及 TTL 配置规则。

Mistral Large 4 的官方价目此次未能获取，未使用第三方价格补入。已搜索的 Google、Qwen、GLM 等当前主力型号多数已在原快照内；本轮不宣称完成所有供应商逐项调价。

npm 原包实测 120752 B 压缩、444351 B 解包。裁剪维护文档、领域词汇表和历史更新记录，保留运行代码、费率、样式、图标、locale、安装补丁、README 和 LICENSE。`npm run pack:check` 实际调用 npm dry-run，验证文件完整性并设置压缩 110 KiB / 解包 420 KiB 上限，无新增依赖。最终安装包大小以实际 pack 输出为准。

验证：70 项 Node 测试通过（原有 67 项及新增 3 项费率/计费覆盖），客户端语法与 126107 B / 126976 B 门禁通过。实际安装包为 108833 B 压缩、410595 B 解包，压缩体积较基线减少 9.87%；解包后插件入口和新增模型计价可加载，包内 21 个文件与当前源码逐字节一致。

续接验收：当前 GUI 的 `/status`、`/pricing`、`/budget?light=1` 均返回 200，运行中费率接口已返回 142 个条目及本轮新增费率，宿主配置存储可用。检查仅读取，没有修改现有 Token/CNY 限额。未变更页面布局或交互，未执行真实账号账单查询、真实限额熔断、桌面安装及市场发布。
