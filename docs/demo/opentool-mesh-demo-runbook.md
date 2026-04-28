# OpenTool Mesh Demo 最终彩排 Runbook

## 1. 文档目标

本文回填 OpenTool Mesh 黑客松 demo 的真实启动命令、真实仓库路径、真实 trace / report 引用与评委讲解脚本。唯一主线固定为：

`publish -> discover -> verify -> call -> trace -> report`

所有演示动作都围绕 `/workspace/project/docs/product/opentool-mesh-产品说明与验收边界.md` 的验收边界展开，不扩展到 marketplace、payment、swarm 或 MCP Registry 替代叙事。

## 2. 本次彩排的真实基线

### 2.1 仓库根目录

- 所有命令默认从 `/workspace/project` 执行。
- 不要从 `packages/cli` 目录单独跑 `call`，因为 `examples/audit-agent/fixtures/sample-contract-input.json` 里的 `sourceFile` 使用当前工作目录解析。

### 2.2 当前可直接引用的 demo 证据

- manifest 文件：`/workspace/project/manifests/solidity-pattern-scanner.manifest.json`
- ENS 本地解析记录：`/workspace/project/.opentoolmesh/ens-records.json`
- AXL peer registry：`/workspace/project/.opentoolmesh/axl-peers.json`
- Solidity 输入：`/workspace/project/examples/audit-agent/fixtures/sample-contract.sol`
- CLI 调用输入：`/workspace/project/examples/audit-agent/fixtures/sample-contract-input.json`

### 2.3 推荐作为“成功回放”的真实 run

优先使用 audit agent 跑出的这一条成功 run：

- trace id：`5ba66c85-a4fe-40dd-9b5f-fe94b42846fe`
- trace URI：`0g://traces/5ba66c85-a4fe-40dd-9b5f-fe94b42846fe.json`
- trace 文件：`/workspace/project/.opentoolmesh/storage/traces/5ba66c85-a4fe-40dd-9b5f-fe94b42846fe.json`
- report id：`report_1777388216943`
- report URI：`0g://reports/report_1777388216943.json`
- report 文件：`/workspace/project/.opentoolmesh/storage/reports/report_1777388216943.json`
- tool output artifact：`/workspace/project/.opentoolmesh/storage/artifacts/5ba66c85-a4fe-40dd-9b5f-fe94b42846fe.json`

这条 run 的关键字段已经一致：

- requested capability：`solidity-static-analysis`
- tool identity：`otm:ens:solidity-scanner.auditagent.eth`
- ENS name：`solidity-scanner.auditagent.eth`
- manifest URI：`0g://manifests/otm_ens_solidity-scanner.auditagent.eth-0.1.0.json`
- manifest hash：`sha256:ddd20540138a8fb9711cb3d751f940964390d3a9fb54e147c0284e6205f64524`
- owner：`0x1234567890abcdef1234567890abcdef12345678`
- AXL peer：`axl-peer-solidity-01`

## 3. 演示形态

### 3.1 最低展示形态

- 终端 A：Agent / CLI
- 终端 B：Remote tool node
- 浏览器：dashboard
- 一次完整成功 run 或一条成功 run 回放

### 3.2 必须明确说出的口径

- “这里是两个独立进程，不是 agent 内部直接调用本地函数。”
- “agent 只知道 capability，不预置具体工具 endpoint。”
- “ENS 负责 identity，0G 负责 manifest / trace / artifact，AXL 负责远程调用。”

## 4. 启动前检查

### 4.1 环境前提

当前环境里没有全局 `pnpm`。如需重新构建，优先使用：

```bash
corepack pnpm <command>
```

但本仓库根目录 `corepack pnpm build` / `corepack pnpm test` 当前会因为 `turbo` 的 package manager binary 解析失败而中断，因此现场彩排以仓库内现成 `dist` 产物为准。

### 4.2 启动前确认

1. `node` 可用。
2. `/workspace/project/services/tool-node/dist/services/tool-node/src/server.js` 存在。
3. `/workspace/project/packages/cli/dist/cli/src/index.js` 存在。
4. `/workspace/project/examples/audit-agent/dist/examples/audit-agent/src/run-audit.js` 存在。
5. `/workspace/project/.opentoolmesh/axl-peers.json` 中存在：

```json
{
  "peers": {
    "axl-peer-solidity-01": "http://127.0.0.1:4318"
  }
}
```

## 5. 标准启动顺序

### 5.1 浏览器：启动 dashboard

dashboard 位于 `/workspace/project/apps/dashboard`。

启动命令：

```bash
cd /workspace/project/apps/dashboard
corepack pnpm dev
```

健康检查接口：

```bash
curl -s http://127.0.0.1:3000/api/health
```

说明：

- 当前 dashboard 页面数据源是静态文件 `/workspace/project/apps/dashboard/lib/demo-run.ts`。
- 这意味着浏览器页面不是直接实时读取 `.opentoolmesh/storage`，而是展示一份 demo 数据模型。
- 因此现场要么提前把 `lib/demo-run.ts` 同步成与本次成功 run 一致的值，要么诚实说明 dashboard 是“基于真实 run 字段映射的静态展示层”。

### 5.2 终端 B：启动 remote tool node

命令：

```bash
cd /workspace/project/services/tool-node
PORT=4318 node dist/services/tool-node/src/server.js
```

成功标志：

```text
OpenTool Mesh tool node listening on http://127.0.0.1:4318
```

这一步对应：

- remote node 独立进程
- AXL peer base URL 为 `http://127.0.0.1:4318`
- 调用方法为 `invokeTool`
- `4318` 是当前仓库已写入 `.opentoolmesh/axl-peers.json` 的复用端口；如果现场该端口已被别的本地进程占用，可以改成例如 `PORT=4320 ...`，但必须同时把 `.opentoolmesh/axl-peers.json` 里的 `axl-peer-solidity-01` 映射改成同一个新端口，否则 CLI / audit agent 会继续请求旧地址。

### 5.3 终端 A：准备 publish / discover / resolve / call

所有 CLI 命令都从项目根目录执行：

```bash
cd /workspace/project
```

## 6. 真实演示命令

### 6.1 Publish

```bash
node packages/cli/dist/cli/src/index.js publish --manifest manifests/solidity-pattern-scanner.manifest.json
```

预期输出要点：

```json
{
  "toolId": "otm:ens:solidity-scanner.auditagent.eth",
  "manifestUri": "0g://manifests/otm_ens_solidity-scanner.auditagent.eth-0.1.0.json",
  "manifestHash": "sha256:ddd20540138a8fb9711cb3d751f940964390d3a9fb54e147c0284e6205f64524",
  "version": "0.1.0",
  "capabilities": ["solidity-static-analysis"]
}
```

发布后可立即佐证：

- ENS 记录文件：`/workspace/project/.opentoolmesh/ens-records.json`
- manifest 持久化文件：`/workspace/project/.opentoolmesh/storage/manifests/otm_ens_solidity-scanner.auditagent.eth-0.1.0.json`

### 6.2 Discover

```bash
node packages/cli/dist/cli/src/index.js discover --capability solidity-static-analysis
```

评委要看到：

- capability 是 `solidity-static-analysis`
- 返回对象里有 `ensName`
- 返回对象里有 `manifestUri`
- 这一步不是读取本地硬编码 endpoint

### 6.3 Resolve

```bash
node packages/cli/dist/cli/src/index.js resolve --tool solidity-scanner.auditagent.eth
```

评委要看到：

- `latestManifestUri`
- `latestManifestHash`
- `latestVersion`
- `ownerAddress`

### 6.4 Call

```bash
node packages/cli/dist/cli/src/index.js call --tool solidity-scanner.auditagent.eth --input examples/audit-agent/fixtures/sample-contract-input.json
```

真实成功输出示例字段：

```json
{
  "traceId": "2280458b-aefa-4a50-95f2-3a800f7d36b0",
  "status": "ok",
  "traceUri": "0g://traces/2280458b-aefa-4a50-95f2-3a800f7d36b0.json"
}
```

说明：

- 这条 CLI run 证明了 `publish -> discover/resolve -> verify -> call -> trace` 可以从 CLI 走通。
- 如果要展示 final report 引用 trace id，优先切换到下方 audit agent 的完整 run。

### 6.5 Audit Agent 完整 run

```bash
cd /workspace/project/examples/audit-agent
node dist/examples/audit-agent/src/run-audit.js
```

当前已验证成功的输出字段：

```json
{
  "requestedCapability": "solidity-static-analysis",
  "toolId": "otm:ens:solidity-scanner.auditagent.eth",
  "manifestUri": "0g://manifests/otm_ens_solidity-scanner.auditagent.eth-0.1.0.json",
  "traceId": "5ba66c85-a4fe-40dd-9b5f-fe94b42846fe",
  "traceUri": "0g://traces/5ba66c85-a4fe-40dd-9b5f-fe94b42846fe.json",
  "report": {
    "reportId": "report_1777388216943"
  }
}
```

这一条是本次 demo 推荐主证据，因为它同时具备：

- discovery
- manifest verification
- remote call
- trace
- final report

### 6.6 Trace 查询

查询 CLI run：

```bash
cd /workspace/project
node packages/cli/dist/cli/src/index.js trace --trace 2280458b-aefa-4a50-95f2-3a800f7d36b0
```

查询 audit agent 基准 run：

```bash
cd /workspace/project
cat .opentoolmesh/storage/traces/5ba66c85-a4fe-40dd-9b5f-fe94b42846fe.json
cat .opentoolmesh/storage/reports/report_1777388216943.json
cat .opentoolmesh/storage/artifacts/5ba66c85-a4fe-40dd-9b5f-fe94b42846fe.json
```

## 7. 双终端演示脚本

### 7.1 开场

“OpenTool Mesh 不是再做一个 agent，而是把 agent 工具调用从本地硬编码升级为可发现、可验证、可远程调用、可复盘的基础设施层。今天只演示最小闭环：publish -> discover -> verify -> call -> trace -> report。”

### 7.2 Publish

终端 A 执行 `publish`。

口径：

- “这里发布的不是本地函数，而是一个带 ENS identity、0G manifest 和 capability index 的远程工具。”
- “评委现在看到的是 tool identity、manifest URI、manifest hash、version 和 capability。”

### 7.3 Discover

终端 A 执行 `discover`。

口径：

- “Agent 不知道 endpoint，只知道自己需要 `solidity-static-analysis`。”
- “这一步先走 capability index，再拿到 ENS identity。”

### 7.4 Resolve / Verify

终端 A 执行 `resolve`，并对照 manifest / ENS 文件。

口径：

- “在真正调用前，agent 会校验 manifest hash、owner、version 和 schema compatibility。”
- “最低验收要求里的 manifest hash、owner、version、schema status 在这里都有证据。”

### 7.5 Call

终端 A 执行 `call` 或 `run-audit`，终端 B 保持 tool node 日志可见。

口径：

- “现在发生的是 agent 到 remote tool node 的 AXL 调用，而不是 agent 内部函数执行。”
- “两个独立终端对应两个独立节点。”

评委应看到：

- 终端 A 发起请求
- 终端 B 维持独立 node 进程
- trace id / trace URI 被返回

### 7.6 Trace

打开 `/workspace/project/.opentoolmesh/storage/traces/5ba66c85-a4fe-40dd-9b5f-fe94b42846fe.json`。

重点指给评委看：

- `tool.toolId`
- `tool.manifestUri`
- `tool.manifestHash`
- `verification.manifestHashValid`
- `verification.ownerValid`
- `verification.schemaValid`
- `invocation.peerId`
- `io.inputHash`
- `io.outputHash`
- `storage.traceUri`

### 7.7 Report

打开 `/workspace/project/.opentoolmesh/storage/reports/report_1777388216943.json`。

重点指给评委看：

- `reportId`
- `findings`
- 每条 finding 里的 `traceId`
- `toolId`

口径：

- “最终报告不是孤立文本，它回指 trace id，所以这份审计结果可以追溯到具体工具、具体 manifest 和具体远程调用。”

## 8. Dashboard 讲解重点

dashboard 必须只承担“把抽象 infra 讲清楚”的职责。

### 8.1 当前事实

- 页面源码：`/workspace/project/apps/dashboard/components/dashboard-page.tsx`
- demo 数据：`/workspace/project/apps/dashboard/lib/demo-run.ts`
- 当前 `demo-run.ts` 仍是占位数据，例如 `scanner.audittool.eth`、`0g://traces/run-2048`，不是本次真实 run。

### 8.2 彩排前必须同步的字段

如果要让浏览器展示与真实 run 一致，至少把 `lib/demo-run.ts` 改成下面这组值：

- resolved identity：`solidity-scanner.auditagent.eth`
- manifest URI：`0g://manifests/otm_ens_solidity-scanner.auditagent.eth-0.1.0.json`
- manifest hash：`sha256:ddd20540138a8fb9711cb3d751f940964390d3a9fb54e147c0284e6205f64524`
- owner：`0x1234567890abcdef1234567890abcdef12345678`
- AXL peer：`axl-peer-solidity-01`
- trace URI：`0g://traces/5ba66c85-a4fe-40dd-9b5f-fe94b42846fe.json`
- artifact ref：`0g://artifacts/5ba66c85-a4fe-40dd-9b5f-fe94b42846fe.json`
- report ref：`0g://reports/report_1777388216943.json`
- findings：`3`
- severity：`high=1, medium=1, low=1`

### 8.3 四段讲法

- Discovery：requested capability 先行，不是 hardcoded endpoint
- Manifest：展示 URI、hash、owner、version、schema verified
- Invocation：展示 agent 到 remote tool node 的 AXL 调用
- Memory：展示 input hash、output hash、trace URI、artifact / report 引用

## 9. 故障兜底

### 9.1 Publish 失败

直接切到已发布状态，展示：

- `/workspace/project/.opentoolmesh/ens-records.json`
- `/workspace/project/.opentoolmesh/storage/manifests/otm_ens_solidity-scanner.auditagent.eth-0.1.0.json`

口径：

“现场不重复发布，直接使用已发布结果，重点展示 discover、verify、call、trace、report。”

### 9.2 AXL 实时调用失败

立即切到成功回放：

- trace：`/workspace/project/.opentoolmesh/storage/traces/5ba66c85-a4fe-40dd-9b5f-fe94b42846fe.json`
- report：`/workspace/project/.opentoolmesh/storage/reports/report_1777388216943.json`
- artifact：`/workspace/project/.opentoolmesh/storage/artifacts/5ba66c85-a4fe-40dd-9b5f-fe94b42846fe.json`

口径：

“这里回放的是同一版本代码已成功跑通的一次 AXL 调用，目的是证明链路结构与 provenance 字段。”

### 9.3 Dashboard 未刷新

dashboard 当前本身就是静态 demo 数据驱动，不要假装它是实时面板。

口径：

“dashboard 用来解释一条完整 run 的字段映射，实时证据在终端输出和 `.opentoolmesh/storage` 文件里。”

### 9.4 根目录 build / test 失败

如评委问到构建：

- 诚实说明当前环境的 `turbo` 通过 `corepack pnpm` 运行时存在 package manager binary 解析问题
- 本次 demo 以仓库内已有 `dist` 产物和真实成功 run 为准

不要把这个说成代码逻辑失败。

## 10. 建议节奏

建议控制在 5 到 7 分钟：

1. 30 秒：项目定位
2. 45 秒：publish / ENS / 0G manifest
3. 60 秒：discover / verify
4. 90 秒：双终端展示 AXL remote call
5. 60 秒：trace / artifact / report
6. 45 秒：dashboard 四段总结

## 11. 验收映射

| 验收项 | demo 中如何证明 |
| --- | --- |
| 工具可发布 | `publish` 输出 + `.opentoolmesh/ens-records.json` + `.opentoolmesh/storage/manifests/...` |
| agent 可发现工具 | `discover --capability solidity-static-analysis` 返回 ENS identity 与 manifest 指针 |
| manifest 可验证 | `resolve` 输出与 trace 中的 `verification` 字段、manifest hash、owner、version 对齐 |
| agent 可远程调用 tool node | 终端 A 运行 `call` / `run-audit`，终端 B 独立运行 `server.js` |
| trace 写入 0G | `.opentoolmesh/storage/traces/5ba66c85-a4fe-40dd-9b5f-fe94b42846fe.json` |
| report 引用 trace | `.opentoolmesh/storage/reports/report_1777388216943.json` 内每条 finding 的 `traceId` |
| dashboard 讲清完整链路 | 浏览器展示 Discovery / Manifest / Invocation / Memory，并口头说明其字段映射自真实 run |

## 12. 本次核验结论

截至 2026-04-28，本仓库里已经存在可直接彩排的真实命令与真实 run 证据：

- tool node 实际启动命令可用
- CLI `publish / discover / resolve / call / trace` 实际入口可用
- audit agent 完整 `publish -> discover -> verify -> call -> trace -> report` 跑通过
- 成功 run 固定引用 `5ba66c85-a4fe-40dd-9b5f-fe94b42846fe`

当前唯一需要现场保持诚实说明的点：

- dashboard 仍然使用 `apps/dashboard/lib/demo-run.ts` 的静态 demo 数据，若不先同步成真实 run，浏览器展示将与终端证据不一致
- 根目录 `corepack pnpm build` / `test` 当前受 `turbo` 运行环境影响，不能作为现场主链路
