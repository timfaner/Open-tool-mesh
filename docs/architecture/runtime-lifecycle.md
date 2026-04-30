# 运行时生命周期
> Runtime Lifecycle

本页按真实代码入口解释一次运行如何从 manifest 发布走到 dashboard 展示。重点是当前仓库已经实现的读写路径，而不是未来理想流程。

> This page explains the real runtime lifecycle implemented in the repository today.

## 总览 / End-to-End Flow

```text
manifest.json
  -> CLI publish
  -> local storage + ENS-style records + capability index
  -> discover by capability
  -> resolve identity
  -> load manifest
  -> verify manifest
  -> invoke remote tool node
  -> persist request / response / tool output / trace / report
  -> dashboard reads latest successful runtime
```

## 1. Publish Flow

主要入口：

- `packages/cli/src/commands/publish.ts`
- `packages/cli/src/commands/helpers.ts`
- `packages/sdk/src/client/create-client.ts`

执行顺序：

1. CLI 从本地读取 manifest JSON。
2. `readManifestFromFile()` 计算 canonical manifest hash。
3. `client.publishManifest()` 把 manifest 写到 `.opentoolmesh/storage/manifests/`。
4. 同一方法写入 ENS 风格 text records：
   - `opentoolmesh.manifest_uri`
   - `opentoolmesh.manifest_hash`
   - `opentoolmesh.owner`
   - `opentoolmesh.latest_version`
   - `opentoolmesh.capabilities`
5. CLI helper 再调用 `seedCapabilityIndex()` 写 `.opentoolmesh/kv/capability_*.json`。

当前要点：

- 发布不是单点写入，而是 storage、ENS、KV 三处状态一起更新。
- capability index 不是 `publishManifest()` 自动内聚完成，而是 CLI 额外补写。

## 2. Discover and Resolve Flow

主要入口：

- `packages/cli/src/commands/call.ts`
- `examples/audit-agent/src/run-audit.ts`

执行顺序：

1. 按 capability 调用 `client.discoverTools({ capability })`。
2. SDK 从 KV 读取 `capability:<capability>` 索引。
3. 取候选工具后，调用 `client.resolveIdentity({ ensName })`。
4. SDK 从 `ens-records.json` 读取：
   - ownerAddress
   - latest manifest uri
   - latest manifest hash
   - latest version
   - capabilities
5. 用解析出的 `manifestUri` 调用 `client.loadManifest()`。

当前要点：

- capability discovery 与 identity resolution 是两步，不是单一硬编码查找。
- `call.ts` 与 `run-audit.ts` 都显式保留了解析证据，后续会写入 trace.discovery.resolve.evidence。

## 3. Verify Flow

主要入口：

- `packages/sdk/src/client/create-client.ts`

执行顺序：

1. 重新计算 manifest hash，与 identity 上的 `latestManifestHash` 对比。
2. 校验 manifest `owner.address` 是否与 ENS owner 一致。
3. 校验：
   - `schemaVersion === "otm.manifest.v1"`
   - `mcp.protocol === "mcp-compatible"`
   - `invocation.transport === "axl"`
4. 校验 `compatibility.sdkVersionRange` 是否兼容当前 SDK。

失败处理：

- CLI 的 `call` 命令在校验失败时会生成一条 `invocation.status = "rejected"` 的 trace，并持久化 rejection reason。
- audit-agent 示例在校验失败时直接抛错，不继续执行远程调用。

## 4. Call Flow

主要入口：

- `packages/sdk/src/client/create-client.ts`
- `services/tool-node/src/server.ts`
- `services/tool-node/src/handlers/invoke-tool.ts`

执行顺序：

1. SDK 先对输入按 manifest `mcp.inputSchema` 做最小校验。
2. SDK 构造 `ToolInvocationRequest`，生成 `inputHash` 与 `sentAt`。
3. SDK 包装成 `AxlInvokeEnvelope`，通过 `InvocationTransport.invoke()` 发出请求。
4. 本地 devnet transport 从 `axl-peers.json` 查 `peerId -> baseUrl`，再用 HTTP `POST /invokeTool` 调用 tool node。
5. tool node 读取 envelope，执行 scanner，并返回 `AxlResultEnvelope`。
6. SDK 在 `status === "ok"` 时按 `outputSchema` 做最小输出校验。

当前要点：

- 文档中的 AXL 是调用语义层；当前底层实现是本地 HTTP adapter。
- tool node 不参与 discovery、verification 或 trace persistence。

## 5. Trace and Report Flow

主要入口：

- `packages/cli/src/commands/call.ts`
- `examples/audit-agent/src/run-audit.ts`
- `packages/sdk/src/client/create-client.ts`

执行顺序：

1. 调用前持久化 `invocation-request` artifact。
2. 调用后持久化 `invocation-response` artifact。
3. 有输出时持久化 `tool-output` artifact。
4. audit-agent 额外调用 `buildAuditReport()` 生成 report，并持久化到 `reports/`。
5. 组装 `ExecutionTrace`，填入：
   - discovery 证据
   - verification 结果
   - invocation 元数据
   - input/output hashes
   - artifact 列表
6. `recordTrace()` 把完整 trace 写到 `.opentoolmesh/storage/traces/`，并在 `.opentoolmesh/kv/trace_*.json` 写 summary。

当前要点：

- CLI 视角和 agent 视角共享同一套底层 client API。
- dashboard 依赖的是 trace + artifacts + report 的组合，而不是单独某一个文件。

## 6. Dashboard Read Flow

主要入口：

- `apps/dashboard/lib/demo-run.ts`
- `apps/dashboard/lib/runtime-data-source.md`

读取顺序：

1. 优先选取最新成功的 runtime trace。
2. 检查该 trace 对应的 `tool-output` artifact 是否存在。
3. 检查对应的 `audit-report` artifact 是否存在，且 `traceId` 一致。
4. 从同一 runtime 集合恢复 publish、discovery、manifest、invocation、memory、report 六段页面信息。
5. 如果 runtime 文件缺失或不一致，回退到 fixture baseline。

这条读路径说明 dashboard 是“运行证据解释器”，不是静态演示页。

## 7. 本地状态落盘位置 / Runtime State Locations

当前 demo 运行后，主要状态会出现在仓库根目录下：

- `.opentoolmesh/ens-records.json`
- `.opentoolmesh/axl-peers.json`
- `.opentoolmesh/storage/manifests/*.json`
- `.opentoolmesh/storage/artifacts/*.json`
- `.opentoolmesh/storage/traces/*.json`
- `.opentoolmesh/storage/reports/*.json`
- `.opentoolmesh/kv/capability_*.json`
- `.opentoolmesh/kv/trace_*.json`

## 建议对照阅读 / Suggested Source Pairing

- 看发布：`packages/cli/src/commands/publish.ts` + `packages/cli/src/commands/helpers.ts`
- 看 CLI 运行：`packages/cli/src/commands/call.ts`
- 看 agent 运行：`examples/audit-agent/src/run-audit.ts`
- 看本地 adapter：`packages/sdk/src/client/local-devnet.ts`
- 看 dashboard 读路径：`apps/dashboard/lib/demo-run.ts`
