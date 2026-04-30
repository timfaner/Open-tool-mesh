# OpenTool Mesh Demo Runbook

> 返回索引 / Back to index: [docs/demo/README.md](./README.md)

## 1. 目标

本 runbook 只服务一条可复现的 demo 主线：

`publish -> discover -> verify -> call -> trace -> report`

所有命令默认在 `/workspace/project` 执行，且以当前仓库真实可用的源码、fixture 和脚本为准；不要预设某个历史 run ID、手工保存的 `.opentoolmesh` 目录或预置 `dist` 产物一定存在。若现场已经执行过新的 `demo:run`，则应优先读取该次成功运行生成的 trace / artifact / report / manifest。

## 2. 当前仓库内的真实入口

- 总控脚本：`/workspace/project/scripts/demo-run.ts`
- 发布脚本：`/workspace/project/scripts/publish-tool.ts`
- capability 索引脚本：`/workspace/project/scripts/seed-capability-index.ts`
- manifest：`/workspace/project/manifests/solidity-pattern-scanner.manifest.json`
- tool node 源码：`/workspace/project/services/tool-node/src/server.ts`
- dashboard 静态数据：`/workspace/project/apps/dashboard/lib/demo-run.ts`
- dashboard 所用 fixture：
  - `/workspace/project/examples/audit-agent/fixtures/sample-execution-trace.json`
  - `/workspace/project/examples/audit-agent/fixtures/sample-tool-output.json`
  - `/workspace/project/examples/audit-agent/fixtures/sample-report.json`

## 3. 一次性准备

安装依赖：

```bash
corepack pnpm install
```

当前仓库根脚本已经改为递归构建，不再依赖失效的 turbo package-manager 检测：

```bash
corepack pnpm build
```

如果只想构建 demo 相关包，也可以用：

```bash
corepack pnpm --filter @opentoolmesh/shared build
corepack pnpm --filter @opentoolmesh/sdk build
corepack pnpm --filter @opentoolmesh/cli build
corepack pnpm --filter @opentoolmesh/tool-node build
corepack pnpm --filter @opentoolmesh/audit-agent build
```

## 4. 最短复现路径

运行完整 demo 闭环：

```bash
corepack pnpm demo:run
```

这个命令会：

1. 清理并重建本地 `.opentoolmesh` 状态目录
2. 构建 `sdk` / `tool-node` / `audit-agent` 的 dist 产物
3. 写入 AXL peer registry
4. 如 `http://127.0.0.1:4318/health` 未运行 tool-node，则临时启动本地 tool node；如已运行，则直接复用
5. publish manifest
6. seed capability index
7. discover tool
8. resolve ENS identity
9. verify manifest
10. 由 audit-agent 可执行链路完成 remote call
11. 生成 trace / artifact / report

成功后会输出一段 JSON，包含：

- `toolNode.mode`
- `publish.manifestUri`
- `discover[0].manifestUri`
- `resolve.latestManifestUri`
- `verify.ok`
- `call.traceId`
- `trace.traceUri`
- `report.reportId`
- `files.trace`
- `files.artifact`
- `files.report`

这些输出分别代表：

- 输入：示例合约源码来自 `examples/audit-agent/fixtures/sample-contract.sol`
- 中间产物：请求、响应、tool output 会写入 `.opentoolmesh/storage/artifacts`
- 结果产物：trace 写入 `.opentoolmesh/storage/traces`，report 写入 `.opentoolmesh/storage/reports`
- 使用场景：适合验证整个仓库是否能完成一次最小远程工具调用闭环

## 5. 拆步演示命令

如果现场需要分步骤演示，可按下面顺序执行。

### 5.1 启动 dashboard

```bash
cd /workspace/project/apps/dashboard
npm run dev -- --hostname 127.0.0.1 --port 3000
```

成功标志：

```text
✓ Ready in ...
```

访问入口：

- 页面：`http://127.0.0.1:3000/`
- 健康检查：`http://127.0.0.1:3000/api/health`

说明：

- `next dev` 首次启动会先编译页面；在终端出现 `Ready` 之前，健康检查可能短暂超时。
- `docs/demo/demo-health-check.sh` 已内置重试，适合在 dashboard 与 tool-node 都启动后执行。

### 5.2 启动 remote tool node

```bash
cd /workspace/project
corepack pnpm demo:tool-node
```

成功标志：

```text
OpenTool Mesh tool node listening on http://127.0.0.1:4318
```

访问入口：

- tool-node 调用入口：`http://127.0.0.1:4318/invokeTool`
- 健康检查口径：`GET http://127.0.0.1:4318/health` 返回 `200`

### 5.3 Publish

```bash
cd /workspace/project
corepack pnpm demo:publish
```

预期输出字段：

- `toolId`
- `manifestUri`
- `manifestHash`
- `version`
- `capabilities`
- `peerId`

### 5.4 Discover / Resolve / Verify / Call / Trace / Report

如果已经单独启动了 tool-node，可执行：

```bash
cd /workspace/project
corepack pnpm demo:publish
corepack pnpm demo:audit-agent
```

如果希望一键跑完整链路，执行：

```bash
cd /workspace/project
corepack pnpm demo:run
```

`demo:run` 现在会自动复用已启动的 `tool-node`，不会再与 `demo:tool-node` 争抢 `4318` 端口；同时它内部复用 audit-agent 的真实构建产物，避免脚本逻辑漂移。

### 5.5 服务健康检查

在 dashboard 与 tool-node 都启动后执行：

```bash
cd /workspace/project
bash docs/demo/demo-health-check.sh
```

预期结果：

- dashboard：`GET http://127.0.0.1:3000/api/health` 返回 `200`
- tool-node：`GET http://127.0.0.1:4318/health` 返回 `200`

说明：

- 健康检查只证明 dashboard 进程与 tool-node 进程存活，不证明页面已经展示最新运行态数据。
- 页面展示的数据口径仍以第 6 节为准：先找最新成功 trace，再定位其绑定的 artifact / report / manifest。

## 6. Dashboard 对齐口径

dashboard 页面现在遵循唯一一套 authoritative 规则，供 devops 文档同步与 api-tester 闭环比对复用：

1. 若本地存在 `.opentoolmesh/storage/traces/*.json`，则按 trace 内 `storage.persistedAt` 选择最近一次成功 `demo:run` 产物。
2. 选中 trace 后，页面必须只展示与该 trace 绑定的运行态数据：
   - trace：`.opentoolmesh/storage/traces/<traceId>.json`
   - artifact：trace 内 `tool-output` artifact 指向的 `.opentoolmesh/storage/artifacts/<traceId>.json`
   - report：trace 内 `audit-report` artifact 指向的 `.opentoolmesh/storage/reports/<reportId>.json`
   - manifest：trace 内 `tool.manifestUri` 对应的 `.opentoolmesh/storage/manifests/<file>.json`
3. 若本地不存在成功运行态 trace，才完整回退到仓库 fixture 基线；回退时 trace/report/artifact 必须来自同一组 fixture，manifest 字段必须与 fixture trace 指向的 manifest 保持一致。

当前仓库内的 fixture 回退基线为：

- trace：`examples/audit-agent/fixtures/sample-execution-trace.json`
- artifact：`examples/audit-agent/fixtures/sample-tool-output.json`
- report：`examples/audit-agent/fixtures/sample-report.json`
- manifest：`manifests/solidity-pattern-scanner.manifest.json`

这组 fixture 的当前基准字段为：

- requested capability：`solidity-static-analysis`
- tool identity：`otm:ens:solidity-scanner.auditagent.eth`
- ENS name：`solidity-scanner.auditagent.eth`
- manifest URI：`0g://manifests/otm_ens_solidity-scanner.auditagent.eth-0.1.0.json`
- manifest hash：`sha256:ddd20540138a8fb9711cb3d751f940964390d3a9fb54e147c0284e6205f64524`
- owner：`0x1234567890abcdef1234567890abcdef12345678`
- peer：`axl-peer-solidity-01`
- trace ID：`c1f7441a-42fe-4a2d-b000-ea1bf1e673b4`
- trace URI：`0g://traces/c1f7441a-42fe-4a2d-b000-ea1bf1e673b4.json`
- report ID：`report_1777390727691`
- report URI：`0g://reports/report_1777390727691.json`

运行态样例字段请以现场最新成功 trace 实测为准，不要把某一次 run 的 ID 当成固定基线。执行：

```bash
cd /workspace/project
corepack pnpm demo:run
```

随后至少核对以下运行态字段：

- trace ID：来自 `.opentoolmesh/storage/traces/*.json` 中 `storage.persistedAt` 最新且 `invocation.status=ok` 的记录
- trace URI：该 trace 的 `storage.traceUri`
- report ID：trace 中 `audit-report` artifact 指向 report 文件内的 `reportId`
- report URI：trace 中 `audit-report` artifact 的 `uri`
- manifest URI：trace 中 `tool.manifestUri`
- requested capability：trace 中 `requestedCapability`
- tool identity：trace 中 `tool.toolId`
- peer ID：trace 中 `invocation.peerId`
- AXL method：trace 中 `invocation.method`

对应的页面映射文件：

- `apps/dashboard/lib/demo-run.ts`

## 6.1 闭环测试字段核对清单

api-tester、devops 与现场演示统一按这份 checklist 收口。只要页面、CLI 输出、trace/report/manifest 任一处对不上，就不能视为闭环通过。

优先级规则：

1. 先取最新成功运行态 trace。
2. 没有成功运行态 trace 时，整组回退到 fixture 基线。
3. 不允许 trace 用运行态、report 用 fixture 这类混搭。

必须核对的字段：

- trace：`traceId`、`runId`、`requestedCapability`、`tool.toolId`、`tool.ensName`、`tool.manifestUri`、`tool.manifestHash`、`invocation.peerId`、`invocation.method`、`invocation.status`、`storage.traceUri`、`storage.persistedAt`
- report：`reportId`、`generatedAt`、`summary`、`findings[].traceId`、`findings[].toolId`
- manifest：`toolId`、`version`、`owner.address`、`storage.manifestUri`、`integrity.manifestHash`、`invocation.axlPeerId`、`invocation.axlMethod`
- artifact：trace 中 `tool-output` 与 `audit-report` 两个 artifact 的 `uri` / `hash` 必须能分别对应到本地 artifact 与 report 文件

字段对应关系：

- `trace.tool.manifestUri` 必须等于 manifest 的 `storage.manifestUri`
- `trace.tool.manifestHash` 必须等于 manifest 的 `integrity.manifestHash`
- `trace.invocation.peerId` 必须等于 manifest 的 `invocation.axlPeerId`
- `trace.invocation.method` 必须等于 manifest 的 `invocation.axlMethod`
- `report.reportId` 必须与 trace 中 `audit-report` artifact 指向的 report 文件一致
- `report.findings[].traceId` 必须全部等于当前 trace 的 `traceId`
- `report.findings[].toolId` 必须全部等于当前 trace 的 `tool.toolId`

执行顺序建议：

1. `corepack pnpm demo:run`
2. `bash docs/demo/demo-health-check.sh`
3. 打开 dashboard 页面，确认其展示字段与最新运行态 trace 对齐
4. 若 dashboard 未读取到运行态，再检查是否因为本地没有成功 trace 而回退到 fixture；只有这种情况下才允许展示 fixture 基线

## 7. 现场讲解口径

- “Agent 只知道 capability，不预置具体 endpoint。”
- “调用前先做 ENS identity 和 manifest verification。”
- “实际执行发生在独立的 remote tool node 进程，不是 agent 内部本地函数。”
- “trace、artifact、report 会回写到 0G 风格的本地 devnet 存储结构，便于复盘 provenance。”

## 8. 验收映射

| 验收项 | 仓库内如何证明 |
| --- | --- |
| 工具可发布 | `corepack pnpm demo:publish` 输出 manifest 字段 |
| agent 可发现工具 | `corepack pnpm demo:run` 输出 `discover` |
| manifest 可验证 | `corepack pnpm demo:run` 输出 `verify.ok=true` 与 checks |
| agent 可远程调用 tool node | `corepack pnpm demo:tool-node` + `corepack pnpm demo:run` |
| trace 写入存储 | `demo:run` 输出 `files.trace` |
| report 引用 trace | `sample-report.json` 与运行时 report 都包含 `traceId` |
| dashboard 字段一致 | `apps/dashboard/lib/demo-run.ts` 运行态优先读取最近一次完整且成功的 `demo:run`，即使更新的 trace 失败或残缺也继续回看更早成功运行；仅在无可用成功运行时回退到与 runbook 一致的 fixture 基线 |

## 9. 当前结论

截至 2026-04-28，仓库内可复现的主链路应以 `corepack pnpm demo:run` 为准。

从仓库根目录可执行的完整演示命令为：

```bash
corepack pnpm install
corepack pnpm build
corepack pnpm demo:run
```

如需拆步演示，使用：

```bash
corepack pnpm demo:tool-node
corepack pnpm demo:publish
corepack pnpm demo:audit-agent
```

不要再使用以下已失效假设：

- “仓库里已经有可直接复用的 `.opentoolmesh` 状态目录”
- “CLI、tool-node、audit-agent 的 `dist` 一定已存在”
- “dashboard 永远只看 fixture，不会读取运行态 trace/report”
