# 模块接口参考
> Module Interface Reference

本文基于当前仓库真实实现，说明 `packages/shared`、`packages/sdk`、`packages/cli`、`services/tool-node`、`examples/audit-agent`、`apps/dashboard` 之间已经存在的输入输出契约、调用边界和源码入口。

> This document maps the module interfaces that already exist in the repository today, including their inputs, outputs, boundaries, and code entry points.

## 阅读前提 / Read This After

建议先阅读：

1. [系统总览 / System Overview](./system-overview.md)
2. [模块边界 / Module Boundaries](./module-boundaries.md)
3. [Trace 契约参考 / Trace Contract Reference](./trace-schema.md)

## 单一契约来源 / Contract Source Of Truth

当前跨模块接口的类型事实主要集中在两个共享文件：

- [packages/shared/src/manifest.ts](/workspace/project/packages/shared/src/manifest.ts:1)
- [packages/shared/src/invocation.ts](/workspace/project/packages/shared/src/invocation.ts:1)
- [packages/shared/src/trace.ts](/workspace/project/packages/shared/src/trace.ts:1)

SDK 对外暴露的运行时 use case 接口收敛在：

- [packages/sdk/src/types/contracts.ts](/workspace/project/packages/sdk/src/types/contracts.ts:1)

## 模块依赖方向 / Dependency Direction

当前仓库里真实成立的依赖方向如下：

- `packages/shared -> packages/sdk`
- `packages/shared -> packages/cli`
- `packages/shared -> services/tool-node`
- `packages/shared -> examples/audit-agent`
- `packages/sdk -> packages/cli`
- `packages/sdk -> examples/audit-agent`
- `services/tool-node` 不依赖 `packages/sdk`
- `apps/dashboard` 不发起调用，只消费 runtime 结果

这意味着：

- `shared` 只定义契约，不编排流程
- `sdk` 是统一 client API 层
- `cli` 和 `audit-agent` 都是 SDK 消费方
- `tool-node` 是被调用方，实现 invocation handler
- `dashboard` 是只读解释器，不是执行入口

## 核心接口总表 / Core Interfaces

| 模块 | 入口接口 | 输入 | 输出 | 源码入口 |
| --- | --- | --- | --- | --- |
| `packages/shared` | `ToolManifest` | manifest JSON | 类型约束 | [manifest.ts](/workspace/project/packages/shared/src/manifest.ts:9) |
| `packages/shared` | `ToolInvocationRequest/Response` | 远程调用 envelope | 标准请求/响应 | [invocation.ts](/workspace/project/packages/shared/src/invocation.ts:1) |
| `packages/shared` | `ExecutionTrace` / `AuditReport` | 调用与报告证据 | trace/report 契约 | [trace.ts](/workspace/project/packages/shared/src/trace.ts:1) |
| `packages/sdk` | `OpenToolMeshClient` | use-case 输入对象 | 解析、发现、校验、调用、留痕结果 | [contracts.ts](/workspace/project/packages/sdk/src/types/contracts.ts:78) |
| `packages/cli` | `publish/resolve/discover/verify/call/trace` | 命令行参数 | JSON stdout + 本地副作用 | [src/index.ts](/workspace/project/packages/cli/src/index.ts:1) |
| `services/tool-node` | `invokeToolHandler()` | `AxlInvokeEnvelope` | `AxlResultEnvelope` | [invoke-tool.ts](/workspace/project/services/tool-node/src/handlers/invoke-tool.ts:1) |
| `examples/audit-agent` | `runAuditDemo()` | 无 CLI 参数，内部读取 fixture | report、trace、response 汇总 | [run-audit.ts](/workspace/project/examples/audit-agent/src/run-audit.ts:109) |
| `apps/dashboard` | `getDemoRun()` 读路径 | trace/report/manifest/output 文件 | `DashboardRun` 视图模型 | [demo-run.ts](/workspace/project/apps/dashboard/lib/demo-run.ts:1) |

## Shared 到 SDK 的接口 / Shared To SDK

### `ToolManifest`

`ToolManifest` 是发布、校验、调用前解析的核心输入，字段定义见 [packages/shared/src/manifest.ts](/workspace/project/packages/shared/src/manifest.ts:9)。

对其他模块最重要的字段有：

- `toolId`
- `capabilities[]`
- `mcp.inputSchema`
- `mcp.outputSchema`
- `invocation.transport`
- `invocation.axlPeerId`
- `invocation.axlMethod`
- `storage.manifestUri`
- `storage.traceNamespace`
- `compatibility.sdkVersionRange`

SDK 会消费这些字段来完成：

- manifest 完整性校验
- input/output schema 校验
- transport 调用参数构造

### `ToolIdentity`

`ToolIdentity` 是 SDK `resolveIdentity()` 的返回值，用来把 ENS 记录转成调用可用的结构：

- `id`
- `ensName`
- `ownerAddress`
- `latestManifestUri`
- `latestManifestHash`
- `latestVersion`
- `capabilities`

它既被 CLI 使用，也被 audit-agent 使用。

## SDK 对外接口 / SDK Public Use Cases

`OpenToolMeshClient` 是当前最重要的跨模块编排接口，定义见 [packages/sdk/src/types/contracts.ts](/workspace/project/packages/sdk/src/types/contracts.ts:78)。

### `resolveIdentity(input)`

- 输入：`ResolveIdentityInput { ensName }`
- 输出：`Promise<ToolIdentity>`
- 作用：把 ENS text records 和 ENS owner 解析成统一身份对象
- 实现： [packages/sdk/src/client/create-client.ts](/workspace/project/packages/sdk/src/client/create-client.ts:49)

### `discoverTools(input)`

- 输入：`DiscoverToolsInput { capability, versionRange?, limit? }`
- 输出：`Promise<DiscoveredTool[]>`
- 作用：从 capability index 取候选工具
- 注意：当前 `versionRange` 还未真正参与筛选逻辑

### `loadManifest(input)`

- 输入：`LoadManifestInput { manifestUri }`
- 输出：`Promise<ToolManifest>`
- 作用：从 blob storage 取 manifest

### `verifyManifest(input)`

- 输入：`VerifyManifestInput { identity, manifest, sdkVersion }`
- 输出：`ManifestVerificationResult`
- 作用：做 hash、owner、schema、version 兼容性四项最小校验
- 注意：这是 MVP 级最小验证，不是生产级签名与权限验证

### `invokeTool(input)`

- 输入：`InvokeToolInput<TInput> { capability, tool, manifest, agentId, input, traceId }`
- 输出：`Promise<ToolInvocationResponse<TOutput>>`
- 作用：把调用方输入包装成 `AxlInvokeEnvelope`，经 transport 发给远端 tool node
- 关键副作用：调用前按 `manifest.mcp.inputSchema` 校验输入，调用后按 `manifest.mcp.outputSchema` 校验输出

### `recordTrace(input)`

- 输入：`RecordTraceInput { trace }`
- 输出：`RecordTraceResult { traceId, traceUri }`
- 作用：持久化完整 trace 并写入 KV 摘要

### `saveArtifact(input)`

- 输入：`SaveArtifactInput { namespace, artifact }`
- 输出：`SaveArtifactResult { uri, hash }`
- 作用：把 request、response、tool output、report 等对象落盘为 blob

### `publishManifest(input)`

- 输入：`PublishManifestInput { manifest }`
- 输出：`PublishManifestResult { manifestUri, manifestHash, version }`
- 作用：发布 manifest 并更新 ENS text records
- 边界说明：capability index 的写入不在这个接口里，而是 CLI helper 补充完成

### `buildAuditReport(input)`

- 输入：`BuildAuditReportInput`
- 输出：`AuditReport`
- 作用：根据 trace 关联信息和 findings 生成审计报告对象

## CLI 与 SDK 的边界 / CLI As A Thin Shell

CLI 不定义新的领域契约，它只是把 SDK use case 暴露成命令。

对应关系如下：

- `publish` -> `publishManifest()` + `seedCapabilityIndex()`
- `resolve` -> `resolveIdentity()`
- `discover` -> `discoverTools()`
- `verify` -> `loadManifest()` + `verifyManifest()`
- `call` -> `discover/resolve/load/verify/invoke/saveArtifact/recordTrace`
- `trace` -> 读取本地持久化 trace

最值得新贡献者先读的是：

- [packages/cli/src/commands/publish.ts](/workspace/project/packages/cli/src/commands/publish.ts:1)
- [packages/cli/src/commands/call.ts](/workspace/project/packages/cli/src/commands/call.ts:17)
- [packages/cli/src/commands/trace.ts](/workspace/project/packages/cli/src/commands/trace.ts:4)

## Tool Node 的输入输出契约 / Tool Node Invocation Boundary

`services/tool-node` 是远端执行方。它不做 discovery、manifest verification 或 trace persistence。

它接收的输入是 [packages/shared/src/invocation.ts](/workspace/project/packages/shared/src/invocation.ts:32) 定义的：

- `AxlInvokeEnvelope<TInput>`

它返回的输出是：

- `AxlResultEnvelope<TOutput>`

处理入口 [services/tool-node/src/handlers/invoke-tool.ts](/workspace/project/services/tool-node/src/handlers/invoke-tool.ts:1) 的行为边界非常清楚：

- 从 `envelope.request.input.source` 取工具输入
- 执行具体扫描逻辑
- 返回 `ToolInvocationResponse`
- 保留 `traceId`、`requestId`、`toolId`

这意味着 tool node 只负责“执行并返回结果”，不负责“把结果写成 artifact 或 trace”。

## Audit Agent 的消费接口 / Audit Agent As A Reference Consumer

[examples/audit-agent/src/run-audit.ts](/workspace/project/examples/audit-agent/src/run-audit.ts:109) 展示了 SDK 消费方的最小完整接入方式：

1. `discoverTools()`
2. `resolveIdentity()`
3. `loadManifest()`
4. `verifyManifest()`
5. `saveArtifact()` 保存 request
6. `invokeTool()`
7. `saveArtifact()` 保存 output 与 response
8. `buildAuditReport()`
9. `recordTrace()`

这里最关键的接口边界是：

- audit-agent 不直接操作 `.opentoolmesh/` 文件结构
- audit-agent 不自己构造 transport envelope
- audit-agent 只通过 SDK client API 与系统交互

这使它成为“贡献者理解 agent 如何接入”的最佳示例，而不是另一个核心框架层。

## Dashboard 的读接口 / Dashboard Read Boundary

`apps/dashboard` 不调用 SDK client，也不发起 remote invocation。它的接口边界是“读取 runtime 证据并映射为页面模型”。

在 [apps/dashboard/lib/demo-run.ts](/workspace/project/apps/dashboard/lib/demo-run.ts:363) 中，dashboard 会：

- 读取 trace
- 通过 trace 中的 URI 反查 manifest、report、tool-output
- 验证 `traceId`、`traceUri`、`manifestUri` 是否一致
- 组装成 `DashboardRun`

因此 dashboard 依赖的不是某个单独 API，而是一组必须对齐的跨文件契约：

- `ExecutionTrace`
- `AuditReport`
- `ToolManifest`
- tool output artifact shape

## 最小交互示例 / Minimal Interaction Example

下面用伪代码展示当前各模块的最小交互：

```ts
const client = createOpenToolMeshClient(deps);

const discovered = await client.discoverTools({ capability: "solidity-static-analysis", limit: 1 });
const identity = await client.resolveIdentity({ ensName: discovered[0].ensName });
const manifest = await client.loadManifest({ manifestUri: identity.latestManifestUri });
const verification = await client.verifyManifest({
  identity,
  manifest,
  sdkVersion: "0.1.0"
});

if (!verification.ok) {
  await client.recordTrace({ trace: rejectedTrace });
  return;
}

const response = await client.invokeTool({
  capability: "solidity-static-analysis",
  tool: identity,
  manifest,
  agentId: "audit-agent-example",
  input: { source },
  traceId
});

const report = await client.buildAuditReport({
  traceId,
  traceUri,
  toolId: identity.id,
  manifestUri: identity.latestManifestUri,
  manifestVersion: identity.latestVersion,
  summary,
  findings
});
```

这段示例体现了真实边界：

- 共享契约定义 shape
- SDK 编排调用顺序
- tool node 只响应 invocation
- dashboard 再消费 trace/report/artifact

## 当前边界内外 / In Scope vs Out Of Scope

当前已经实现的接口边界：

- ENS 身份解析
- capability index 发现
- manifest 最小校验
- AXL 语义调用
- trace 与 artifact 持久化
- dashboard runtime 只读消费

当前还未实现为稳定公共接口的部分：

- marketplace / payment
- 生产级签名验证
- 权限与 reputation 系统
- 多 agent 编排控制面
- 远程链上 ENS / 0G / AXL 真后端

## 代码入口速查 / Code Entry Points

- [packages/shared/src/manifest.ts](/workspace/project/packages/shared/src/manifest.ts:1)
- [packages/shared/src/invocation.ts](/workspace/project/packages/shared/src/invocation.ts:1)
- [packages/shared/src/trace.ts](/workspace/project/packages/shared/src/trace.ts:1)
- [packages/sdk/src/types/contracts.ts](/workspace/project/packages/sdk/src/types/contracts.ts:1)
- [packages/sdk/src/client/create-client.ts](/workspace/project/packages/sdk/src/client/create-client.ts:49)
- [packages/cli/src/commands/helpers.ts](/workspace/project/packages/cli/src/commands/helpers.ts:1)
- [packages/cli/src/commands/call.ts](/workspace/project/packages/cli/src/commands/call.ts:17)
- [services/tool-node/src/handlers/invoke-tool.ts](/workspace/project/services/tool-node/src/handlers/invoke-tool.ts:1)
- [examples/audit-agent/src/run-audit.ts](/workspace/project/examples/audit-agent/src/run-audit.ts:109)
- [apps/dashboard/lib/demo-run.ts](/workspace/project/apps/dashboard/lib/demo-run.ts:363)
