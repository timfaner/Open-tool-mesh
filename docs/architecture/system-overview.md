# 系统总览
> System Overview

OpenTool Mesh 当前仓库实现的是一条面向 Agent 远程工具调用的 MVP 闭环：用 manifest 描述工具，用 capability index + ENS 风格身份解析发现工具，在调用前校验 manifest 与 owner 绑定关系，通过远程 tool node 执行调用，再把 trace 和 report 落盘给 dashboard 读取。

> The current repository implements a working MVP loop for remote tool usage by agents.

## 核心闭环 / Core Lifecycle

系统围绕一条固定顺序的运行链组织：

`publish -> discover -> verify -> call -> trace -> report`

- `publish`：CLI 读取 manifest，并通过 SDK 写入本地 0G-like storage、ENS text records 与 capability index。
- `discover`：agent 或 CLI 按 capability 从索引中找候选工具，再解析 ENS 身份拿到最新 manifest 指针。
- `verify`：SDK 校验 manifest hash、owner、schema 版本与 SDK 兼容性。
- `call`：SDK 将请求包装成 AXL 风格 envelope，并通过本地 HTTP transport 调用远端 tool node。
- `trace`：请求、响应、tool output、trace summary 被写入 `.opentoolmesh/`。
- `report`：audit report 被生成并持久化，dashboard 优先读取最新成功 runtime。

## 主模块 / Main Modules

### `packages/shared`

共享契约层，是跨模块类型事实来源。当前定义：

- `manifest.ts`：`ToolIdentity`、`ToolManifest`、`CapabilityIndexEntry`
- `invocation.ts`：`ToolInvocationRequest`、`ToolInvocationResponse`、AXL envelopes
- `trace.ts`：`ExecutionTrace`、`AuditReport`

### `packages/sdk`

运行时编排层，把身份解析、发现、校验、调用、留痕与发布组合成统一 client API。当前核心实现位于 `packages/sdk/src/client/create-client.ts`。

### `packages/cli`

命令入口层，是 SDK 的薄壳。`publish` 负责发布 manifest 并补 capability index，`call` 负责跑通最完整的 CLI 调用链。

### `services/tool-node`

被调用方执行层。当前通过 `services/tool-node/src/server.ts` 暴露：

- `GET /health`
- `POST /invokeTool`

### `examples/audit-agent`

参考接入方示例。`examples/audit-agent/src/run-audit.ts` 演示 agent 如何执行 discovery、verification、remote invocation、trace persistence 与 report generation。

### `apps/dashboard`

只读解释层。`apps/dashboard/lib/demo-run.ts` 负责优先读取最新成功 runtime trace；数据不完整时才回退到 fixtures。

## 组件边界 / Component Boundaries

| 组件 | 当前负责什么 | 当前不负责什么 |
| --- | --- | --- |
| ENS 风格记录 | 身份入口、manifest pointer、owner root | 完整 manifest 存储、能力搜索、远程调用 |
| 0G-like storage | manifest、trace、report、tool output 等 JSON blob | 身份解析、P2P transport |
| 0G-like KV | capability index、trace summary | 不可变 blob 存储、owner 信任根 |
| AXL 语义层 | agent 与 tool node 的请求/响应 envelope | discovery、schema 管理、trace persistence |
| MCP-compatible manifest | 输入输出 schema、工具名、调用元数据 | 分布式发现、执行历史 |

## 本地 devnet 映射 / Local Devnet Mapping

当前仓库没有直接连接真实 ENS、0G 或 AXL 网络，而是通过 `packages/sdk/src/client/local-devnet.ts` 把这些概念映射到仓库根目录下的 `.opentoolmesh/`：

- `ens-records.json`：ENS text records 与 ownerAddress
- `axl-peers.json`：peerId 到本地 HTTP base URL 的映射
- `storage/`：manifest、artifacts、traces、reports
- `kv/`：capability index 与 trace summary

这意味着文档里提到的 ENS / 0G / AXL，在当前实现里都是“接口语义存在，本地文件系统 adapter 落地”。

## 真实调用链入口 / Real Code Entry Points

- 发布链路：`packages/cli/src/commands/publish.ts` 和 `packages/cli/src/commands/helpers.ts`
- CLI 调用链：`packages/cli/src/commands/call.ts`
- Agent 调用链：`examples/audit-agent/src/run-audit.ts`
- 远端执行：`services/tool-node/src/handlers/invoke-tool.ts`
- Dashboard 读路径：`apps/dashboard/lib/demo-run.ts`

## 当前 MVP 范围 / Current MVP Scope

当前文档描述的“已实现”范围严格限制在 Solidity Audit Agent demo 闭环：

- 一个示例 capability：`solidity-static-analysis`
- 一个示例 tool node：`solidity-pattern-scanner`
- 一个参考 agent：`audit-agent-example`
- 一个只读 dashboard：展示 publish、discover、verify、call、trace、report 六步

## 当前非目标 / Current Non-Goals

以下能力在仓库里并未作为已实现产品交付，阅读时不要把它们误认为现状：

- 通用工具市场
- 支付与结算
- 多租户权限系统
- 多 agent 编排平台
- 真实去中心化后端集成
