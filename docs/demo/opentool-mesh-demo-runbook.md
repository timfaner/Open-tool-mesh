# OpenTool Mesh Demo Runbook

## 1. 目标

本 runbook 只服务一条可复现的 demo 主线：

`publish -> discover -> verify -> call -> trace -> report`

所有命令默认在 `/workspace/project` 执行，且以当前仓库真实可用的源码、fixture 和脚本为准，不再依赖历史 run ID、手工保存的 `.opentoolmesh` 目录或预置 `dist` 产物。

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
2. 写入 AXL peer registry
3. 启动本地 tool node
4. publish manifest
5. seed capability index
6. discover tool
7. resolve ENS identity
8. verify manifest
9. call remote tool
10. 生成 trace / artifact / report

成功后会输出一段 JSON，包含：

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

## 5. 拆步演示命令

如果现场需要分步骤演示，可按下面顺序执行。

### 5.1 启动 remote tool node

```bash
corepack pnpm demo:tool-node
```

成功标志：

```text
OpenTool Mesh tool node listening on http://127.0.0.1:4318
```

### 5.2 Publish

```bash
corepack pnpm demo:publish
```

预期输出字段：

- `toolId`
- `manifestUri`
- `manifestHash`
- `version`
- `capabilities`
- `peerId`

### 5.3 Discover / Resolve / Verify / Call / Trace / Report

当前最可靠的方式仍然是直接执行：

```bash
corepack pnpm demo:run
```

原因是这个脚本把 publish、discover、verify、call、trace、report 串成了一次完整回放，并保证产物路径与输出字段一致。

## 6. Dashboard 对齐口径

dashboard 当前展示的是“基于真实字段映射的静态展示层”，不是实时读取 `.opentoolmesh/storage`。

它使用的稳定基线来自仓库内 fixture，而不是运行时生成文件：

- trace：`examples/audit-agent/fixtures/sample-execution-trace.json`
- artifact：`examples/audit-agent/fixtures/sample-tool-output.json`
- report：`examples/audit-agent/fixtures/sample-report.json`

因此浏览器页、文档和代码现在共享同一组核心字段：

- requested capability：`solidity-static-analysis`
- tool identity：`otm:ens:solidity-scanner.auditagent.eth`
- ENS name：`solidity-scanner.auditagent.eth`
- manifest URI：`0g://manifests/otm_ens_solidity-scanner.auditagent.eth-0.1.0.json`
- manifest hash：`sha256:ddd20540138a8fb9711cb3d751f940964390d3a9fb54e147c0284e6205f64524`
- owner：`0x1234567890abcdef1234567890abcdef12345678`
- peer：`axl-peer-solidity-01`
- report ID：`report_demo_solidity_audit`

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
| dashboard 字段一致 | `apps/dashboard/lib/demo-run.ts` 直接引用同一组 fixture |

## 9. 当前结论

截至 2026-04-28，仓库内可复现的主链路应以 `corepack pnpm demo:run` 为准。

不要再使用以下已失效假设：

- “仓库里已经有可直接复用的 `.opentoolmesh` 状态目录”
- “CLI、tool-node、audit-agent 的 `dist` 一定已存在”
- “dashboard 读取的是运行时 trace 文件”
