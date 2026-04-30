# Trace 契约参考
> Trace Contract Reference

本文说明仓库当前真实使用的 `ExecutionTrace` 契约，以及它在 CLI、SDK、tool node、audit-agent、dashboard 之间如何生成、落盘和被消费。

> This document describes the `ExecutionTrace` contract that the repository uses today, and how it is produced, persisted, and consumed across the CLI, SDK, tool node, audit-agent, and dashboard.

## 文档定位 / Position In The Doc Set

建议先阅读：

1. [系统总览 / System Overview](./system-overview.md)
2. [模块边界 / Module Boundaries](./module-boundaries.md)
3. [运行时生命周期 / Runtime Lifecycle](./runtime-lifecycle.md)

再回到本文，把 `trace` 当作 `publish -> discover -> verify -> call -> trace -> report` 闭环中的“证据汇总对象”来理解，而不是孤立日志。

> Read the overview, module boundaries, and runtime lifecycle first. Then come back here and treat `trace` as the evidence bundle for the whole runtime loop, not as an isolated log record.

## 事实来源 / Source Of Truth

`trace` 的单一类型事实来源在 [packages/shared/src/trace.ts](/workspace/project/packages/shared/src/trace.ts:1)。

当前仓库里与 trace 直接相关的实现入口如下：

- 契约定义： [packages/shared/src/trace.ts](/workspace/project/packages/shared/src/trace.ts:1)
- CLI 生成 trace： [packages/cli/src/commands/call.ts](/workspace/project/packages/cli/src/commands/call.ts:17)
- Agent 示例生成 trace： [examples/audit-agent/src/run-audit.ts](/workspace/project/examples/audit-agent/src/run-audit.ts:20)
- SDK 持久化 trace 与摘要： [packages/sdk/src/client/create-client.ts](/workspace/project/packages/sdk/src/client/create-client.ts:175)
- CLI 读取 trace： [packages/cli/src/commands/trace.ts](/workspace/project/packages/cli/src/commands/trace.ts:4)
- Dashboard 消费 trace： [apps/dashboard/lib/demo-run.ts](/workspace/project/apps/dashboard/lib/demo-run.ts:363)

## Trace 在系统里的角色 / What A Trace Is For

`ExecutionTrace` 不是 transport envelope，也不是 audit report。本仓库里它承担三件事：

- 把一次调用链中的 discovery、verification、invocation、artifact、storage 信息收敛到一个对象里。
- 作为 dashboard 的 runtime 优先数据入口，证明这次 demo run 确实发生过，而不是只展示 fixture。
- 为调试提供最短证据链：请求了什么 capability、选中了哪个工具、manifest 是否通过校验、调用是否完成、产物存到了哪里。

> `ExecutionTrace` is the repository's evidence bundle for a runtime call. It records discovery, verification, invocation, artifacts, and storage pointers, and it gives the dashboard and contributors a concrete debugging trail.

## 顶层结构 / Top-Level Shape

`ExecutionTrace` 当前包含以下顶层字段：

| 字段 | 类型 | 含义 |
| --- | --- | --- |
| `traceId` | `string` | 本次 trace 的稳定标识，当前 CLI 与示例 agent 都直接复用 UUID。 |
| `runId` | `string` | 运行标识；当前实现里等于 `traceId`，但语义上保留成“运行实例 ID”。 |
| `agentId` | `string` | 调用方标识，例如 `opentool-cli` 或 `audit-agent-example`。 |
| `requestedCapability` | `string` | 调用方请求的 capability，而不是工具内部方法名。 |
| `tool` | object | 被选中工具的身份与 manifest 指针。 |
| `discovery` | object | capability 发现与 ENS 解析阶段的证据。 |
| `verification` | object | manifest 校验结果。 |
| `invocation` | object | 远端调用阶段的 transport 与状态。 |
| `io` | object | 输入输出内容的 hash 与可选 schema 引用。 |
| `artifacts` | array | 与本次运行绑定的衍生产物列表。 |
| `storage` | object | trace 自己被持久化到哪里、何时落盘。 |

> The current trace schema records who asked for what capability, which tool got selected, how verification went, how invocation ended, what artifacts were produced, and where the trace itself was persisted.

## 关键字段说明 / Key Fields

### `tool`

`tool` 字段记录的是“最终参与调用的工具身份”，而不是 discovery 候选列表：

- `toolId`: 当前使用 ENS 风格 ID，例如 `otm:ens:solidity-scanner.auditagent.eth`
- `ensName`: 便于从 ENS text records 回溯工具身份
- `manifestUri`: 本次调用实际使用的 manifest blob URI
- `manifestHash`: 用于把 runtime 调用和 manifest 完整性校验串起来
- `version`: 工具 manifest 版本
- `ownerAddress`: 当前实现里直接从 identity 解析结果写入

对应构造位置见 [packages/cli/src/commands/call.ts](/workspace/project/packages/cli/src/commands/call.ts:74) 与 [examples/audit-agent/src/run-audit.ts](/workspace/project/examples/audit-agent/src/run-audit.ts:39)。

### `discovery`

`discovery` 记录的是“为什么选中这个工具”，这是 dashboard 能否接受 runtime trace 的关键。

- `capabilityIndexUri`: capability index 的 URI。当前由 CLI 和示例代码显式写成 `0g://indexes/capabilities/<capability>.json`
- `candidateCount`: 被发现的候选数量。当前 `call --tool` 场景会写 `1`
- `selectedReason`: 人类可读的选中原因
- `resolvedAt`: 完成 capability 发现与 ENS 解析的时间戳
- `resolve`: 可选，但对 dashboard runtime 模式几乎是必需

`resolve` 子对象进一步记录：

- `ensName`
- `identityId`
- `manifestUri`
- `manifestHash`
- `version`
- `ownerAddress`
- `evidence`: 一段串联 `discover -> resolveIdentity -> loadManifest -> verifyManifest -> invokeTool` 的证据字符串

Dashboard 在 [apps/dashboard/lib/demo-run.ts](/workspace/project/apps/dashboard/lib/demo-run.ts:375) 明确要求 `resolve.ensName`、`resolve.identityId`、`resolvedAt`、`resolve.evidence` 都存在，否则直接回退到 fixture。

### `verification`

`verification` 记录 manifest 校验的结果。字段来自 SDK `verifyManifest()` 的 checks：

- `manifestHashValid`
- `ownerValid`
- `schemaValid`
- `versionCompatible`
- `verifiedAt`
- `rejectedReason?`

其中 `rejectedReason` 只在 CLI 发现 manifest 校验失败时写入，见 [packages/cli/src/commands/call.ts](/workspace/project/packages/cli/src/commands/call.ts:64)。

这意味着 trace 不只记录成功路径，也记录“为什么在 invoke 前被拒绝”。

### `invocation`

`invocation` 记录远端调用阶段。当前仓库的事实状态是：

- `transport` 固定写 `"axl"`，表示语义上走 AXL invocation
- demo transport 底层仍是本地 HTTP adapter，而不是真实 AXL 网络，见 [packages/sdk/src/client/local-devnet.ts](/workspace/project/packages/sdk/src/client/local-devnet.ts:180)
- `peerId` 和 `method` 来自 manifest invocation 配置
- `requestUri` / `responseUri` 指向额外保存的请求与响应 artifact
- `status` 可能是 `pending | ok | error | rejected`

`rejected` 很重要：它表示 verification 未通过，调用根本没有发出。它不是 tool node 返回的业务错误。

### `io`

`io` 用来保存输入输出的内容摘要，而不是正文内容：

- `inputHash`
- `outputHash?`
- `inputSchemaRef?`
- `outputSchemaRef?`

当前 CLI 与 audit-agent 都只写 hash，不写 schema ref，见 [packages/cli/src/commands/call.ts](/workspace/project/packages/cli/src/commands/call.ts:198) 与 [examples/audit-agent/src/run-audit.ts](/workspace/project/examples/audit-agent/src/run-audit.ts:225)。

### `artifacts`

`artifacts` 是一次 trace 附带的衍生产物索引。当前允许的 `kind` 为：

- `tool-output`
- `audit-report`
- `log`
- `finding`
- `invocation-request`
- `invocation-response`

但当前代码真实写入的主要是：

- CLI：`invocation-request`、`invocation-response`、`tool-output`
- audit-agent 示例：额外再写 `audit-report`

这也是为什么 dashboard 的 runtime 模式必须要求 trace 里能找到 `tool-output` 与 `audit-report` 对应条目。

### `storage`

`storage` 记录 trace 自己的存储元信息：

- `traceUri`
- `persistedAt`
- `backend`

当前 `backend` 固定为 `"0g-storage"`，但在本地 devnet 中，实际会被映射到 `.opentoolmesh/storage/traces/<traceId>.json`，见 [packages/cli/src/commands/helpers.ts](/workspace/project/packages/cli/src/commands/helpers.ts:48)。

## 生命周期事件 / Lifecycle Events

下面是当前仓库里一条成功 trace 的最小生命周期：

1. `discover`
   `client.discoverTools()` 根据 capability 查 KV index。
2. `resolve`
   `client.resolveIdentity()` 根据 ENS 名称解析身份与最新 manifest 指针。
3. `load`
   `client.loadManifest()` 读取 manifest blob。
4. `verify`
   `client.verifyManifest()` 生成 verification checks。
5. `invoke`
   `client.invokeTool()` 发送 `otm.tool.invoke` envelope。
6. `artifact-save`
   请求、响应、tool output、report 等对象按需另存为 artifact。
7. `trace-persist`
   `client.recordTrace()` 把完整 trace 写入 blob，并把摘要写入 KV。
8. `report-consume`
   CLI 或 dashboard 再基于 trace URI、artifact URI 读取证据。

> The repository does not model lifecycle events as a separate event log. Instead, it captures the lifecycle implicitly through trace sections plus artifact pointers and timestamps.

## 最小成功示例 / Minimal Successful Example

下面的 JSON 片段按当前 `ExecutionTrace` 结构整理，字段值取自仓库 fixture 和示例代码，可作为新贡献者理解 shape 的最小样例：

```json
{
  "traceId": "c1f7441a-42fe-4a2d-b000-ea1bf1e673b4",
  "runId": "c1f7441a-42fe-4a2d-b000-ea1bf1e673b4",
  "agentId": "audit-agent-example",
  "requestedCapability": "solidity-static-analysis",
  "tool": {
    "toolId": "otm:ens:solidity-scanner.auditagent.eth",
    "ensName": "solidity-scanner.auditagent.eth",
    "manifestUri": "0g://manifests/otm_ens_solidity-scanner.auditagent.eth-0.1.0.json",
    "manifestHash": "sha256:ddd20540138a8fb9711cb3d751f940964390d3a9fb54e147c0284e6205f64524",
    "version": "0.1.0",
    "ownerAddress": "0x1234567890abcdef1234567890abcdef12345678"
  },
  "discovery": {
    "capabilityIndexUri": "0g://indexes/capabilities/solidity-static-analysis.json",
    "candidateCount": 1,
    "selectedReason": "selected from capability discovery candidates and resolved via ENS before manifest load for solidity-static-analysis",
    "resolvedAt": "2026-04-28T15:30:00.000Z",
    "resolve": {
      "ensName": "solidity-scanner.auditagent.eth",
      "identityId": "otm:ens:solidity-scanner.auditagent.eth",
      "manifestUri": "0g://manifests/otm_ens_solidity-scanner.auditagent.eth-0.1.0.json",
      "manifestHash": "sha256:ddd20540138a8fb9711cb3d751f940964390d3a9fb54e147c0284e6205f64524",
      "version": "0.1.0",
      "ownerAddress": "0x1234567890abcdef1234567890abcdef12345678",
      "evidence": "discover(solidity-static-analysis) -> resolveIdentity(solidity-scanner.auditagent.eth) -> loadManifest(0g://manifests/otm_ens_solidity-scanner.auditagent.eth-0.1.0.json) -> verifyManifest -> invokeTool"
    }
  },
  "verification": {
    "manifestHashValid": true,
    "ownerValid": true,
    "schemaValid": true,
    "versionCompatible": true,
    "verifiedAt": "2026-04-28T15:30:00.000Z"
  },
  "invocation": {
    "transport": "axl",
    "peerId": "axl-peer-solidity-01",
    "method": "invokeTool",
    "requestUri": "0g://artifacts/request.json",
    "responseUri": "0g://artifacts/response.json",
    "startedAt": "2026-04-28T15:30:00.000Z",
    "finishedAt": "2026-04-28T15:30:01.000Z",
    "status": "ok"
  },
  "io": {
    "inputHash": "sha256:...",
    "outputHash": "sha256:..."
  },
  "artifacts": [
    {
      "kind": "invocation-request",
      "uri": "0g://artifacts/request.json",
      "hash": "sha256:...",
      "mediaType": "application/json"
    },
    {
      "kind": "invocation-response",
      "uri": "0g://artifacts/response.json",
      "hash": "sha256:...",
      "mediaType": "application/json"
    },
    {
      "kind": "tool-output",
      "uri": "0g://artifacts/output.json",
      "hash": "sha256:...",
      "mediaType": "application/json"
    },
    {
      "kind": "audit-report",
      "uri": "0g://reports/report_123.json",
      "hash": "sha256:...",
      "mediaType": "application/json"
    }
  ],
  "storage": {
    "traceUri": "0g://traces/c1f7441a-42fe-4a2d-b000-ea1bf1e673b4.json",
    "persistedAt": "2026-04-28T15:30:01.100Z",
    "backend": "0g-storage"
  }
}
```

更接近真实落盘数据的样例可直接看 [examples/audit-agent/fixtures/sample-execution-trace.json](/workspace/project/examples/audit-agent/fixtures/sample-execution-trace.json:1)。

## 生成链路 / How A Trace Is Produced

### CLI 路径

[packages/cli/src/commands/call.ts](/workspace/project/packages/cli/src/commands/call.ts:17) 是当前最完整的 CLI 侧 trace 入口：

1. 解析 `--capability` 或 `--tool`
2. `discoverTools()` 选候选
3. `resolveIdentity()` 获取 tool identity
4. `loadManifest()` 加载 manifest
5. `verifyManifest()` 先决定是否允许继续
6. 如果校验失败，生成 `status: "rejected"` 的 trace 并立刻持久化
7. 如果校验通过，先保存 request artifact，再 `invokeTool()`
8. 保存 response artifact 和可选 `tool-output` artifact
9. `recordTrace()` 落盘完整 trace

这个实现说明了两个事实：

- trace 可以覆盖失败前置阶段，而不仅限于成功调用。
- request / response / output artifact 不是 trace 内联正文，而是外部 blob，通过 URI 回链。

### Agent 示例路径

[examples/audit-agent/src/run-audit.ts](/workspace/project/examples/audit-agent/src/run-audit.ts:109) 展示了“消费方 agent”如何生成更完整的 trace：

- 它和 CLI 一样走 `discover -> resolve -> load -> verify -> invoke`
- 它额外调用 `buildAuditReport()` 生成 report
- 它把 `audit-report` 也加入 `trace.artifacts`

因此，如果你想理解“为什么 dashboard 需要 trace + report + tool output 三者一致”，示例 agent 比 CLI 更接近完整闭环。

### SDK 持久化路径

[packages/sdk/src/client/create-client.ts](/workspace/project/packages/sdk/src/client/create-client.ts:175) 中的 `recordTrace()` 会做两件事：

1. 把完整 trace 作为 blob 写入 `traces` namespace
2. 基于 `buildTraceSummary()` 生成摘要，再写入 KV key `trace:<traceId>`

这意味着系统里同时存在两种 trace 视图：

- 完整文档：供 CLI 直接读取本地文件、供 dashboard 还原细节
- KV 摘要：供未来更轻量的索引或列表能力使用

## 消费链路 / How A Trace Is Consumed

### CLI 读取路径

[packages/cli/src/commands/trace.ts](/workspace/project/packages/cli/src/commands/trace.ts:4) 调用 `readStoredTrace()`，直接从本地 devnet 映射路径读取：

- 逻辑入口： [packages/cli/src/commands/helpers.ts](/workspace/project/packages/cli/src/commands/helpers.ts:48)
- 真实文件： `.opentoolmesh/storage/traces/<traceId>.json`

当前 `trace` 命令读取的是完整 trace 文档，不是 KV 摘要。

### Dashboard 读取路径

[apps/dashboard/lib/demo-run.ts](/workspace/project/apps/dashboard/lib/demo-run.ts:363) 对 runtime trace 有明确约束：

- `trace.invocation.status` 必须是 `ok`
- `discovery.resolve.evidence`、`resolvedAt`、`resolve.ensName`、`resolve.identityId` 必须存在
- trace 中必须能找到 `audit-report`、`tool-output`、以及相关 request / response artifact
- report 的 `traceId`、`traceUri`、`manifestUri` 必须与 trace 一致
- tool output artifact 的 `traceId` 与 `toolId` 也必须对齐

任何一项不满足，dashboard 就会回退到 fixture，而不是展示“不完整但看起来像真的” runtime 数据。

这就是 trace 在当前系统里的调试用途：它不是只给人读的说明对象，而是 dashboard 判断 runtime run 是否可信的证据入口。

## 与 Invocation Envelope 的关系 / Relationship To Invocation Envelopes

trace 本身不是网络请求包。真正跨节点传输的是共享 invocation 契约，定义在 [packages/shared/src/invocation.ts](/workspace/project/packages/shared/src/invocation.ts:1)：

- 请求 envelope：`AxlInvokeEnvelope`
- 响应 envelope：`AxlResultEnvelope`

tool node 的处理入口在 [services/tool-node/src/handlers/invoke-tool.ts](/workspace/project/services/tool-node/src/handlers/invoke-tool.ts:1)，它会返回包含 `traceId` 的 `ToolInvocationResponse`。之后 CLI 或 agent 再把这份响应另存为 artifact，并把 URI 回填进 trace。

换句话说：

- invocation contract 负责“把调用送过去再拿回来”
- trace contract 负责“把这次调用放回整条运行证据链里”

## 调试建议 / Debugging Checklist

当一次 demo run 看起来不对时，建议按以下顺序查 trace：

1. 先看 `verification`
   是否已经在 invoke 前被 `rejected`
2. 再看 `discovery.resolve.evidence`
   是否真的经过 `discover/resolve/load/verify`
3. 再看 `invocation.status`
   区分是 transport 失败、tool 执行错误，还是根本没调用
4. 最后核对 `artifacts` 与 `storage.traceUri`
   确认 dashboard 所需的 report 和 tool output 都能回读

> In practice, the trace is the fastest way to distinguish "tool failed", "verification failed", "dashboard rejected the runtime evidence", and "artifacts were never persisted".

## 相关源码入口 / Related Code Entry Points

- [packages/shared/src/trace.ts](/workspace/project/packages/shared/src/trace.ts:1)
- [packages/shared/src/invocation.ts](/workspace/project/packages/shared/src/invocation.ts:1)
- [packages/sdk/src/client/create-client.ts](/workspace/project/packages/sdk/src/client/create-client.ts:175)
- [packages/sdk/src/client/local-devnet.ts](/workspace/project/packages/sdk/src/client/local-devnet.ts:180)
- [packages/cli/src/commands/call.ts](/workspace/project/packages/cli/src/commands/call.ts:17)
- [packages/cli/src/commands/trace.ts](/workspace/project/packages/cli/src/commands/trace.ts:4)
- [examples/audit-agent/src/run-audit.ts](/workspace/project/examples/audit-agent/src/run-audit.ts:20)
- [examples/audit-agent/tests/run-audit.test.ts](/workspace/project/examples/audit-agent/tests/run-audit.test.ts:4)
- [apps/dashboard/lib/demo-run.ts](/workspace/project/apps/dashboard/lib/demo-run.ts:363)
