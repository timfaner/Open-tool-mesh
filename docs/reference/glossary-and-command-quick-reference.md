# 术语表与命令速查
> Glossary and Command Quick Reference

本文是 OpenTool Mesh 的“最短参考页”：先用中文主导、英文对照统一核心术语，再给出最常用命令的输入、输出与适用场景，帮助新读者不用翻源码也能建立同一套词汇表。

> This page defines the repository's core runtime terms and the shortest practical command set for the MVP demo loop.

## 先记住这条主线 / The Core Loop

当前仓库围绕一条固定顺序运行：

`publish -> discover -> verify -> call -> trace -> report`

- `publish`：把 manifest 发布到本地 0G-like storage，并更新 ENS 风格身份记录与 capability index。
- `discover`：按 capability 找候选工具。
- `verify`：确认 manifest hash、owner、schema 与 SDK 兼容性。
- `call`：按 manifest 的 invocation 配置远程调用 tool node。
- `trace`：把调用证据写成 `ExecutionTrace`。
- `report`：把结果整理成更适合审阅的 audit report。

## 核心术语 / Core Glossary

### `manifest`（工具清单）

英文：`ToolManifest`

指工具的运行时契约 JSON，定义 `toolId`、能力列表、MCP 输入输出 schema、调用 transport、存储命名空间和完整性信息。对当前仓库来说，它不是静态说明书，而是 `publish -> verify -> call` 都会实际消费的事实来源。

最该记住的点：

- 发布后会得到 `manifestUri` 与最终 `manifestHash`
- discover 阶段不会直接返回完整 manifest，只返回指向 manifest 的候选信息
- trace 与 report 会回指这次运行实际使用的那份 manifest

### `trace`（执行留痕）

英文：`ExecutionTrace`

指一次真实调用的证据汇总对象，里面会收敛 discovery、verification、invocation、artifacts 和 storage 信息。它不是工具输出本身，也不是报告，而是“这次运行到底发生了什么”的最短机器事实。

最该记住的点：

- `traceId` 是一次运行的主键
- `requestedCapability` 记录调用方请求的能力，而不是工具内部函数名
- dashboard 优先读取最新成功 trace，而不是先看 fixture

### `tool node`（远程工具节点）

英文：tool node

指真正执行工具逻辑的服务端进程。当前仓库中的示例实现位于 `services/tool-node`，提供 `GET /health` 与 `POST /invokeTool`，负责接收 SDK 发来的调用请求并返回结果。

最该记住的点：

- 它是被调用方，不负责 discover 或 verify
- 当前 demo 里语义上走 AXL invocation，底层实现是本地 HTTP adapter
- `corepack pnpm demo:tool-node` 启动的是这个服务

### `capability index`（能力索引）

英文：`CapabilityIndexEntry`

指 capability 到工具候选列表的索引。它回答的问题不是“工具长什么样”，而是“某个 capability 目前有哪些工具可选”。discover 阶段先查它，再去解析 ENS 身份、加载 manifest。

最该记住的点：

- 它只保存 discovery 最需要的指针，如 `toolId`、`ensName`、`manifestUri`
- `publish` 之后还要 seed/update index，工具才会被 discover 到
- 当前本地 devnet 会把它落到 `.opentoolmesh/kv/`

### `audit report`（审计报告）

英文：`AuditReport`

指在 trace 之后生成的、面向人阅读的结果摘要。它会保留 `traceId`、`traceUri`、`toolId`、`manifestUri`、`summary` 与 `findings`，方便 dashboard 或读者直接复盘“发现了什么问题”。

最该记住的点：

- report 比 trace 更适合看结论
- trace 比 report 更适合追调用证据
- 当前 audit-agent 示例会同时生成 tool output、trace 与 audit report

### `tool identity`（工具身份）

英文：`ToolIdentity`

指 `resolveIdentity()` 从 ENS 风格记录解析出来的运行时身份对象，最小字段包括 `id`、`ensName`、`ownerAddress`、`latestManifestUri`、`latestManifestHash`、`latestVersion`、`capabilities`。

它的作用是把“这个工具是谁”与“它最新 manifest 在哪”绑定起来，供 verify 和 call 使用。

### `artifact`（运行产物）

英文：artifact

指围绕一次调用额外保存的 JSON 对象，比如 `invocation-request`、`invocation-response`、`tool-output`、`audit-report`。artifact 不是总入口，通常需要先通过 trace 才能知道这一轮运行到底生成了哪些 artifact。

## 术语关系速记 / How These Terms Relate

可以用下面这句话快速记忆：

`manifest` 定义工具契约，`capability index` 让工具可被发现，`tool identity` 把 ENS 身份与最新 manifest 绑定，`tool node` 负责执行远程调用，`trace` 记录运行证据，`audit report` 提供面向人的结论摘要。

## 命令速查 / Command Quick Reference

所有命令默认在仓库根目录 `/workspace/project` 执行。

### 环境与整体 demo

| 命令 | 输入 | 主要输出 | 适用场景 |
| --- | --- | --- | --- |
| `corepack pnpm install` | `package.json` / workspace 依赖 | 安装后的 `node_modules` 与 lockfile 解析结果 | 第一次拉起仓库或依赖变更后 |
| `corepack pnpm test` | workspace 源码与测试 | 各 package 的测试结果 | 改动前后做最小回归确认 |
| `corepack pnpm demo:run` | manifest、tool-node、audit-agent、dashboard 读路径所需的全部本地资源 | 一次完整闭环结果，控制台会输出 `manifestUri`、`traceId`、`traceUri`、`reportUri` 等字段，并把运行产物写到 `.opentoolmesh/` | 想一次跑通主线、确认项目确实可用时 |
| `bash docs/demo/demo-prereflight.sh` | 本地 Node / pnpm / 目录环境 | 环境前置检查结果 | 想先确认环境，再决定是否跑 demo |
| `bash docs/demo/demo-health-check.sh` | 已启动的 dashboard 与 tool node | 健康检查结果 | demo 过程中确认服务是否存活 |

### `publish`

| 命令 | 输入 | 主要输出 | 适用场景 |
| --- | --- | --- | --- |
| `corepack pnpm demo:publish` | 默认示例 manifest | JSON：`toolId`、`manifestUri`、`manifestHash`、`version`、`capabilities` | 用仓库自带示例最快完成一次发布 |
| `node packages/cli/dist/packages/cli/src/index.js publish --manifest <path>` | 指定 manifest 文件路径 | JSON：`toolId`、`manifestUri`、`manifestHash`、`version`、`capabilities` | 你已经 build CLI，想发布自定义 manifest |

补充说明：

- `publish` 解决的是“把工具放进系统”。
- 对当前实现来说，发布完成后工具信息会进入本地 storage、ENS 风格记录与 capability index。

### `discover`

| 命令 | 输入 | 主要输出 | 适用场景 |
| --- | --- | --- | --- |
| `node packages/cli/dist/packages/cli/src/index.js discover --capability solidity-static-analysis` | capability 名称 | 候选工具数组，常见字段包括 `toolId`、`ensName`、`manifestUri`、`manifestHash`、`version` | 想知道某个 capability 当前能找到哪些工具 |

补充说明：

- `discover` 返回的是候选信息，不是完整 manifest。
- 如果 discover 结果为空，优先检查是否先执行过 publish，以及 capability index 是否已更新。

### `verify`

| 命令 | 输入 | 主要输出 | 适用场景 |
| --- | --- | --- | --- |
| `node packages/cli/dist/packages/cli/src/index.js verify --tool solidity-scanner.auditagent.eth` | 工具 ENS 名称，可选 `--sdk-version` | JSON：`ok`、`manifestUri`、`manifestHash`、`ownerAddress`、`checks`、`errors` | 想在调用前确认 manifest 是否可信、是否兼容当前 SDK |

补充说明：

- `verify` 的核心检查是 `manifestHashValid`、`ownerValid`、`schemaValid`、`versionCompatible`。
- 这是“能不能安全调用”的最后一道轻量门槛。

### `call`

| 命令 | 输入 | 主要输出 | 适用场景 |
| --- | --- | --- | --- |
| `node packages/cli/dist/packages/cli/src/index.js call --capability solidity-static-analysis --input examples/audit-agent/fixtures/sample-call-input.json` | capability 与输入 JSON；也可改用 `--tool <ens-name>` | JSON：`traceId`、`status`、可选 `output`、`traceUri` | 想从 CLI 直接完成一次 discover/verify/invoke/trace |
| `corepack pnpm demo:audit-agent` | 已 publish 的示例工具、示例 Solidity 合约 | JSON：`requestedCapability`、`manifestUri`、`verification`、`traceId`、`traceUri`、`reportUri`、`response` | 想看一个示例 agent 如何消费远程能力并生成 report |

补充说明：

- `call` 是最接近真实运行链的命令，因为它会实际发起远程调用并记录 trace。
- `demo:audit-agent` 比 CLI `call` 多一步 audit report 生成，更适合理解 dashboard 最终会展示什么。

### `tool node` 与 dashboard

| 命令 | 输入 | 主要输出 | 适用场景 |
| --- | --- | --- | --- |
| `corepack pnpm demo:tool-node` | tool-node 源码与 build 产物 | 本地服务进程，默认监听 `http://127.0.0.1:4318` | 需要单独启动远程工具执行服务时 |
| `cd apps/dashboard && npm run dev -- --hostname 127.0.0.1 --port 3000` | dashboard 源码 | 本地 dashboard，默认 `http://127.0.0.1:3000` | 想图形化复盘最近一次 trace/report 时 |

## 选命令的最短决策 / Shortest Command Decision Guide

- 想确认仓库能不能跑：先 `corepack pnpm test`，再 `corepack pnpm demo:run`
- 想只做发布：跑 `corepack pnpm demo:publish`
- 想只看某个 capability 能发现谁：跑 CLI `discover`
- 想在调用前看 manifest 是否过检：跑 CLI `verify`
- 想看最接近真实 agent 的演示：跑 `corepack pnpm demo:audit-agent`
- 想看可视化证据链：先跑 `demo:run`，再启动 dashboard

## 延伸阅读 / Read Next

- 想看分步骤演示与运行产物位置：读 [Demo 文档索引 / Demo Docs](../demo/README.md)
- 想看 manifest 与 trace 的正式契约说明：读 [Manifest Schema](../architecture/manifest-schema.md) 与 [Trace Schema](../architecture/trace-schema.md)
- 想看系统边界：读 [系统总览 / System Overview](../architecture/system-overview.md)
