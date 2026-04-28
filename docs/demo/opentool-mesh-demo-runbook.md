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

## 6. Dashboard 对齐口径

dashboard 会优先读取最近一次 `corepack pnpm demo:run` 生成的 `.opentoolmesh/storage/{traces,artifacts,reports}` 产物。

如果运行时产物不存在，才回退到仓库内 fixture 基线：

- trace：`examples/audit-agent/fixtures/sample-execution-trace.json`
- artifact：`examples/audit-agent/fixtures/sample-tool-output.json`
- report：`examples/audit-agent/fixtures/sample-report.json`

因此现场推荐顺序是：

1. 先执行 `corepack pnpm demo:run`
2. 再启动 dashboard
3. 页面中的 `trace/report/manifest` 字段会与最近一次闭环运行结果一致

回退到 fixture 时，浏览器页、文档和代码共享的默认基线字段为：

- requested capability：`solidity-static-analysis`
- tool identity：`otm:ens:solidity-scanner.auditagent.eth`
- ENS name：`solidity-scanner.auditagent.eth`
- manifest URI：`0g://manifests/otm_ens_solidity-scanner.auditagent.eth-0.1.0.json`
- manifest hash：`sha256:ddd20540138a8fb9711cb3d751f940964390d3a9fb54e147c0284e6205f64524`
- owner：`0x1234567890abcdef1234567890abcdef12345678`
- peer：`axl-peer-solidity-01`
- trace ID：`41f036ae-ba64-43b7-b310-1927e73396d4`
- trace URI：`0g://traces/41f036ae-ba64-43b7-b310-1927e73396d4.json`
- report ID：`report_demo_solidity_audit`
- report URI：`0g://reports/report_demo_solidity_audit.json`

当前 dashboard 数据源文件：

- `examples/audit-agent/fixtures/sample-execution-trace.json`
- `examples/audit-agent/fixtures/sample-tool-output.json`
- `examples/audit-agent/fixtures/sample-report.json`

这些 fixture 只作为无运行产物时的回退基线；一旦 `.opentoolmesh/storage` 内存在最近一次 `demo:run` 结果，`apps/dashboard/lib/demo-run.ts` 会优先展示运行态 trace/report/artifact 字段。

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
| dashboard 字段一致 | `apps/dashboard/lib/demo-run.ts` 优先读取 `.opentoolmesh/storage`，无运行产物时回退 fixture |

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
- “dashboard 读取的是运行时 trace 文件”
