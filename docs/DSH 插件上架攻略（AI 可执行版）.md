# DSH 插件上架攻略（AI 可执行版）

> 适用对象：DeepSeek Harness（DSH）插件作者和自动化发布流程。
>
> 目标：把插件打成可由 `dsh plugin add` 安装的 bundle，发布到 npm，并按需提交到社区目录。
>
> 规则会随 DSH 和各目录仓库变化，提交前以目标仓库的 `CONTRIBUTING.md`、schema 和 CI 为准。

## 1. 先确认产物类型

| 类型 | 形态 | 安装方式 | 是否需要 bundle |
| --- | --- | --- | --- |
| Skill | `SKILL.md` 和脚本资源 | 放入技能目录后被发现 | 否 |
| Plugin | JS/TS 模块，导出 `apply(ctx)` | `dsh plugin --profile <profile> add <spec>` | 是 |

只有 Plugin 才适合提交到插件目录。纯 Skill 通常只需要发布公开仓库并添加对应 topic，具体以目录规则为准。

## 2. 准备合格的 bundle

`package.json` 至少确认以下项目：

```json
{
  "name": "dsh-your-plugin",
  "version": "1.0.0",
  "type": "module",
  "main": "./lib/index.js",
  "files": ["lib", "cordis.patch.yml"],
  "dsh": {
    "bundle": {
      "patch": "./cordis.patch.yml"
    }
  }
}
```

检查重点：

- `main` 或 `exports` 指向构建后的入口，不要指向不存在的源码产物。
- `files` 包含入口和 `cordis.patch.yml`。
- `dsh.bundle.patch` 非空，并且路径相对于包根目录正确。
- `version` 已递增，npm 不允许覆盖已发布版本。
- Plugin 入口导出宿主需要的 `apply` / `inject`，不要引入未声明的运行时依赖。

构建和本地安装验证：

```bash
# 使用项目实际构建命令，确保构建产物最新
pnpm exec tsc

# 在干净 profile 中验证安装和功能
dsh plugin --profile demo add ./

# 检查最终 npm 包内容
pnpm pack --dry-run
```

本地安装成功且功能真正生效后，再发布 npm。若安装成功但功能没有生效，优先检查 `dsh.bundle.patch`、patch 文件路径和入口导出。

## 3. 发布 npm

优先发布包含预构建产物的 npm 包，避免用户从 Git 直装时遇到构建脚本授权和缺少 `lib/` 的问题：

```bash
pnpm publish --access public
```

发布后验证用户安装路径：

```bash
dsh plugin --profile web add dsh-your-plugin
```

发布前不要把 token、私钥、`.env`、本地会话数据或调试日志放进包或 Git 历史。

## 4. 添加 GitHub topic

在公开 GitHub 仓库添加：

```text
dsh-plugin
```

topic 是自动聚合市场常用的发现入口，通常不需要提交 PR；收录由目标站点定期刷新，不能保证即时出现，也不等于进入人工精选目录。

## 5. 提交精选目录

目录规则经常变化，提交前重新打开目标仓库的贡献指南和 schema。常见通道如下。

### awesome-dsh-plugin / dsh-market

通常只新增一个 `data/plugins/<owner>__<repo>.yml`：

```yaml
url: https://github.com/owner/repo
name: owner/repo
category: tools
description:
  en: One-line factual description ending with a period.
  zh: 一句话客观描述，以句号结尾。
```

注意：

- `description.en` 必填，描述必须能从源码和 README 证实。
- `category` 必须来自目标仓库当前允许的列表。
- 按仓库要求重新生成 README，不要手工编辑生成文件。
- 遵守单个 PR 的条目上限和仓库年龄、提交次数等门槛。

典型本地检查：

```bash
npm ci
node scripts/generate-readme.mjs
```

### 1024Store

以实际接受插件提交的仓库和当前文档为准。常见提交物是：

```text
catalog/plugins/<normalized-id>.json
```

示例结构：

```json
{
  "$schema": "../schema/plugin.schema.json",
  "id": "owner/repo",
  "name": "repo",
  "repository": "https://github.com/owner/repo",
  "category": "tools",
  "description": {
    "en": "Factual one-line description.",
    "zh": "客观的一句话描述。"
  },
  "added": "2026-10-28"
}
```

只修改目录要求允许的路径。CI 通常会检查仓库 `package.json` 中的 `dsh.bundle.patch`，并确认 patch 文件在同一 revision 中存在。

## 6. 发布前清单

```text
[ ] 确认是 Plugin，而不是纯 Skill
[ ] package.json 的入口、type、files、version 正确
[ ] dsh.bundle.patch 指向存在的 patch 文件
[ ] 构建产物已生成且本地 profile 安装可用
[ ] pnpm pack --dry-run 的内容不含凭据、缓存和临时文件
[ ] pnpm publish --access public 发布成功
[ ] 公开 GitHub 仓库添加 dsh-plugin topic
[ ] 按需提交 awesome-dsh-plugin 条目
[ ] 按需提交 1024Store 条目
[ ] 重新核对目标仓库当前 schema、CI 和贡献规则
```

## 7. 高频故障

- **安装成功但插件不生效**：检查 `dsh.bundle.patch` 是否非空、patch 路径是否正确、入口是否导出 `apply`。
- **Git 直装拿到源码但没有 `lib/`**：改用 npm 发布预构建包，或按用户侧 pnpm 版本明确配置构建脚本授权。
- **预发布版本无法满足 peer dependency**：不要依赖一个看似覆盖全部版本的宽 semver 范围；按实际 `0.x.y` 预发布元组测试，并在上游版本变化后更新范围。
- **启动时报 duplicate loader entry id**：检查插件安装后是否又把同名条目手工写入 profile 的 `cordis.patch.yml`。
- **目录 PR 被拒**：确认只修改允许路径、条目数量符合要求、描述客观且 `package.json` 与 patch 文件能被 CI 找到。

## 最短可行路径

```text
确认 Plugin → bundle 自测 → 发布 npm → 添加 dsh-plugin topic → 按需提交精选目录 PR
```
