# 架构文档导航
> Architecture Documentation Map

本目录解释 OpenTool Mesh 当前仓库已经实现的真实架构闭环，而不是未来愿景。建议先跑通 demo，再按本目录阅读顺序理解模块边界、运行链路与本地 devnet 映射。

> This directory documents the architecture that exists in the repository today, not a future-state design.

## 推荐阅读顺序 / Recommended Reading Order

1. [系统总览 / System Overview](./system-overview.md)：先理解 `publish -> discover -> verify -> call -> trace -> report` 闭环，以及 ENS / 0G / AXL / MCP 的职责分工。
2. [模块边界 / Module Boundaries](./module-boundaries.md)：再看 `packages/shared`、`packages/sdk`、`packages/cli`、`services/tool-node`、`examples/audit-agent`、`apps/dashboard` 各自负责什么。
3. [运行时生命周期 / Runtime Lifecycle](./runtime-lifecycle.md)：最后顺着真实调用链阅读 CLI、agent、tool node、storage、dashboard 如何串起来。
4. [MVP 架构草案 / MVP Architecture Draft](./opentool-mesh-mvp-architecture.md)：作为历史背景参考，不再是优先入口。
5. [契约参考占位页 / Contract Reference Placeholders](./manifest-schema.md)：`manifest-schema.md`、`trace-schema.md`、`module-interfaces.md` 当前仍是占位文档，后续由单独任务补全，不应作为本目录的主要入口。

## 按读者入口阅读 / Entry Points by Reader Type

### 新贡献者 / New Contributors

优先阅读：

- [系统总览](./system-overview.md)
- [模块边界](./module-boundaries.md)
- [运行时生命周期](./runtime-lifecycle.md)

这条路径用于快速建立“代码已经实现到哪里”的共同认知。

### SDK 与 CLI 维护者 / SDK and CLI Maintainers

优先阅读：

- [模块边界](./module-boundaries.md)
- [运行时生命周期](./runtime-lifecycle.md)
- [系统总览](./system-overview.md)

这条路径聚焦 SDK 作为编排核心、CLI 作为壳层入口的边界。接口级契约文档仍待后续补齐。

### Demo 与 Dashboard 维护者 / Demo and Dashboard Maintainers

优先阅读：

- [运行时生命周期](./runtime-lifecycle.md)
- [系统总览](./system-overview.md)
- [MVP 架构草案](./opentool-mesh-mvp-architecture.md)

这条路径聚焦 demo 运行结果如何落盘，以及 dashboard 为什么能从 runtime trace 恢复页面叙事。

## 当前文档覆盖范围 / What This Set Covers

- 系统闭环：发布、发现、校验、调用、留痕、报告
- 目录职责：哪些逻辑属于 shared、sdk、cli、tool node、example、dashboard
- 真实调用链：以 `packages/cli/src/commands/call.ts` 与 `examples/audit-agent/src/run-audit.ts` 为主入口
- 本地 devnet：以 `.opentoolmesh/` 模拟 ENS、0G Storage、0G KV 与 AXL peer registry

## 当前待补文档 / Pending Docs

以下三篇文件已经预留路径，但当前仍是占位文本，应视为后续契约参考任务的交付范围，而不是本轮架构总览任务的完成内容：

- [Manifest Schema](./manifest-schema.md)
- [Trace Schema](./trace-schema.md)
- [模块接口 / Module Interfaces](./module-interfaces.md)

## 当前非目标 / Current Non-Goals

以下内容在当前文档中只会被点到，不会被写成已经实现：

- marketplace 或 payment
- 多 agent 编排平台
- 生产级签名验证、权限系统与 reputation
- 真正链上 ENS / 0G / AXL 后端接入

## 代码入口速查 / Code Entry Points

- Agent 运行入口：`examples/audit-agent/src/run-audit.ts`
- CLI 调用入口：`packages/cli/src/commands/call.ts`
- CLI 发布入口：`packages/cli/src/commands/publish.ts`
- SDK 编排入口：`packages/sdk/src/client/create-client.ts`
- 本地 devnet adapter：`packages/sdk/src/client/local-devnet.ts`
- Tool node 服务入口：`services/tool-node/src/server.ts`
- Dashboard 读路径入口：`apps/dashboard/lib/demo-run.ts`
