# 贡献指南
> Contributing Guide for OpenTool Mesh

本指南面向第一次给 OpenTool Mesh 提交文档或代码改动的贡献者。目标不是介绍所有内部实现，而是让你在不先通读源码的前提下，也能安全地准备环境、选择合适的工作流、完成最小验证，并提交一份可评审的 Pull Request。

> This guide helps new contributors submit documentation or code changes safely without reading the whole codebase first.

## 贡献前先了解什么 / What to Know Before Contributing

OpenTool Mesh 当前是一个围绕远程工具发布、发现、校验、调用与审计闭环的开源 MVP。作为贡献者，你通常只需要先掌握三件事：

- 仓库使用 `pnpm workspace` 管理多个包与应用。
- 大多数命令默认在仓库根目录执行。
- 提交前应做与改动范围匹配的最小验证，而不是机械地跑所有可能命令。

如果你还没跑过项目，建议先读：

- [README.md](./README.md)
- [docs/getting-started/README.md](./docs/getting-started/README.md)
- [docs/architecture/README.md](./docs/architecture/README.md)

## 环境准备 / Environment Setup

推荐环境：

- Node.js `>= 22`
- `corepack` 可用
- Git

首次进入仓库时，在根目录执行：

```bash
cd /workspace/project
corepack pnpm install
```

安装完成后，建议先确认基础状态：

```bash
corepack pnpm test
```

如果你只是第一次验证环境，也可以结合以下文档或脚本：

- [docs/getting-started/quickstart.md](./docs/getting-started/quickstart.md)
- [docs/getting-started/troubleshooting.md](./docs/getting-started/troubleshooting.md)
- `bash docs/demo/demo-prereflight.sh`

## 推荐工作流 / Recommended Workflow

推荐按下面顺序贡献，而不是直接改一批文件后再一次性排错：

1. 从最新主线分出一个清晰命名的分支。
2. 先读与你任务直接相关的文档或模块入口，不必先通读整个仓库。
3. 做最小改动，避免把文案更新顺手扩展成重构。
4. 运行与改动范围匹配的最小验证。
5. 自查 diff、补充 PR 描述，再发起 Pull Request。

一个常见的本地节奏如下：

```bash
git checkout -b docs/update-contributing-guide
corepack pnpm install
# 编辑文档或代码
# 运行最小验证
git status
git diff --stat
```

## 提交前最小验证 / Minimum Validation Before Submission

请按改动类型选择最小但足够的验证，不要求所有贡献都跑完整 demo。

### 文档改动 / Documentation Changes

至少确认：

- Markdown 链接能跳到真实存在的文件
- 命令示例在仓库根目录上下文中成立
- 中英文对照没有互相冲突

推荐检查：

```bash
git diff --check
```

如果你新增或修改了运行命令、目录入口或上手说明，建议额外执行：

```bash
corepack pnpm test
```

### 代码改动 / Code Changes

至少确认：

- 受影响的 workspace tests 通过
- TypeScript 类型检查通过
- 若改动影响 demo 主链路，已做一次最小 demo 验证

常用命令：

```bash
corepack pnpm test
corepack pnpm typecheck
```

涉及主链路时，再补充：

```bash
corepack pnpm demo:run
```

### 何时需要更多验证 / When More Validation Is Needed

以下情况应主动扩大验证范围：

- 修改 `packages/sdk`、`packages/cli`、`services/tool-node` 这类核心链路代码
- 修改 README、quickstart、demo runbook 中的关键命令
- 修改 dashboard 对 trace、report、fixture 的读取逻辑

这时至少在 PR 描述里说明你跑了哪些命令、没有跑哪些命令，以及原因。

## 文档改动要求 / Documentation Change Expectations

文档贡献优先满足“新读者能直接用”，而不是“作者自己知道在说什么”。

请尽量做到：

- 以中文为主，必要处补英文对照，保持当前仓库文档风格一致
- 对命令、路径、脚本名使用精确写法
- 链接到现有文档入口，避免让读者自己猜阅读顺序
- 如果描述的是当前实现，优先写代码库里真实存在的行为，不写理想状态

不建议：

- 引入未实现的流程说明
- 把历史草案当作默认入口
- 在一次文档提交里顺手重组大量无关章节

## 代码改动要求 / Code Change Expectations

代码贡献请保持改动范围收敛，并让评审者容易看出行为变化。

请尽量做到：

- 修改前先确认真实入口文件与调用链
- 优先提交最小安全 diff，避免顺手重命名、搬运或抽象无关代码
- 如果行为变更会影响文档、示例或 demo，连同相关说明一起更新
- 在提交信息或 PR 描述中写清楚“改了什么、为什么改、如何验证”

如果你不确定改动是否会影响架构边界，请先阅读：

- [docs/architecture/system-overview.md](./docs/architecture/system-overview.md)
- [docs/architecture/module-boundaries.md](./docs/architecture/module-boundaries.md)
- [docs/architecture/runtime-lifecycle.md](./docs/architecture/runtime-lifecycle.md)

## PR 描述建议 / Pull Request Description Tips

一个容易评审的 PR 描述通常至少包含以下信息：

- 背景：这个问题、缺口或改动动机是什么
- 变更范围：本次具体修改了哪些文件或哪段流程
- 验证方式：你实际运行了哪些命令
- 风险与边界：哪些内容刻意没有纳入这次改动

可直接复用下面的模板：

```md
## 背景
- 说明问题或目标

## 本次改动
- 列出主要文件与改动点

## 验证
- `corepack pnpm test`
- `corepack pnpm typecheck`

## 未包含
- 列出你刻意不在本次处理的 follow-ups
```

## 常见贡献场景 / Common Contribution Scenarios

### 场景 1：我只想修正文档或补一页说明

建议做法：

- 先确认根 README 或 `docs/README.md` 是否已经有合适入口
- 新增文档时，把入口补到最近的导航页，而不是只新增孤立文件
- 至少检查链接、命令和阅读顺序是否自洽

通常不需要：

- 修改代码
- 运行完整 demo，除非你改的是 demo 指令本身

### 场景 2：我想修一个 CLI / SDK / tool node 的小问题

建议做法：

- 先定位真实入口和受影响包
- 保持 patch 聚焦在问题本身
- 跑 `corepack pnpm test` 与 `corepack pnpm typecheck`
- 若改动触及主链路，再跑 `corepack pnpm demo:run`

### 场景 3：我改了 onboarding、quickstart 或 demo runbook

这是高影响文档改动，因为它直接影响新贡献者首次上手。

建议做法：

- 确认命令在根目录可执行
- 确认 README、`docs/README.md` 与目标文档之间的跳转一致
- 至少跑一次 `corepack pnpm test`，避免把过时命令写回文档

### 场景 4：我不确定该改文档、示例还是代码

先问自己两个问题：

- 这是“行为缺陷”还是“说明缺失”？
- 新用户是否可以通过补文档先绕开问题？

如果问题本质是文档与当前实现不一致，优先先修文档；如果代码行为本身错误，再提交对应代码修复。

## 提交质量自查 / Submission Checklist

提交前可快速自查：

- 我是否只修改了完成这次任务所需的最小文件集？
- 我是否补充了新文件的入口链接？
- 我是否运行了与改动范围匹配的最小验证？
- 我是否在 PR 描述中写清楚验证命令和未处理范围？

满足以上几点，通常就已经是一份对开源协作者友好的提交。
