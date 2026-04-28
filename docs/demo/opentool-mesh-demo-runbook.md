# OpenTool Mesh Demo 部署与启动编排

## 1. 目标与边界

本文件只覆盖 demo 彩排与现场展示所需的运行编排，不改 `apps/dashboard` 页面实现。主链路固定为：

`publish -> discover -> verify -> call -> trace -> report`

所有命令默认在仓库根目录 `/workspace/project` 执行，除非命令块里另有说明。

## 2. 当前仓库现状

截至 `2026-04-28`，需要先明确三件事：

1. `docs/demo` 里原有 runbook 引用的 `.opentoolmesh` 运行时数据并不在当前工作树内，不能再当作“仓库自带证据”。
2. `apps/dashboard/lib/demo-run.ts` 当前直接 import 真实 manifest / trace / report / artifact JSON，不再是纯占位常量。
3. `packages/cli/dist` 当前已存在，可直接作为 CLI 入口；`services/tool-node` 与 `examples/audit-agent` 仍缺少 `dist` 产物，若要完整跑 demo，必须先构建这两个包。

因此，本编排把命令分成两类：

- `可立即检查`：不依赖运行中的服务，可直接核对环境与文件。
- `可启动演示`：依赖 workspace 安装与构建完成后执行。

## 3. 目录与关键文件

- demo 文档：`/workspace/project/docs/demo/opentool-mesh-demo-runbook.md`
- 环境自检：`/workspace/project/docs/demo/demo-prereflight.sh`
- 健康检查：`/workspace/project/docs/demo/demo-health-check.sh`
- 根 manifest：`/workspace/project/manifests/solidity-pattern-scanner.manifest.json`
- tool-node manifest：`/workspace/project/services/tool-node/manifests/solidity-pattern-scanner.manifest.json`
- dashboard 健康接口：`/workspace/project/apps/dashboard/app/api/health/route.ts`
- tool-node 服务：`/workspace/project/services/tool-node/src/server.ts`
- CLI 入口：`/workspace/project/packages/cli/src/index.ts`
- audit agent：`/workspace/project/examples/audit-agent/src/run-audit.ts`
- 示例 trace：`/workspace/project/examples/audit-agent/fixtures/sample-execution-trace.json`

## 4. 环境前提

### 4.1 必备运行时

- `node >= 22`
- `npm` 或 `corepack`
- 仓库根目录可写：因为本地 devnet 会在运行时生成 `.opentoolmesh/`

### 4.2 必备依赖状态

当前仓库未发现 workspace 级 `node_modules`。这意味着：

- `apps/dashboard` 只有 `package-lock.json`，可以单独用 `npm install` / `npm run dev` 解决前端依赖。
- monorepo 其余包默认依赖 workspace 解析；若未先安装，`packages/cli`、`services/tool-node`、`examples/audit-agent` 无法直接执行。

建议先运行：

```bash
cd /workspace/project
bash docs/demo/demo-prereflight.sh
```

## 5. 启动矩阵

### 5.1 终端 A：dashboard

仅当前端依赖已安装时执行：

```bash
cd /workspace/project/apps/dashboard
npm run dev
```

默认地址：

```text
http://127.0.0.1:3000
```

健康检查：

```bash
curl -fsS http://127.0.0.1:3000/api/health
```

当前接口返回：

```json
{"ok":true,"service":"dashboard-scaffold"}
```

这表示 dashboard 进程活着，但不代表 demo 数据已经和最新闭环 run 对齐。

### 5.2 终端 B：tool-node

仅当 workspace 依赖已安装且构建完成后执行：

```bash
cd /workspace/project
npm run build --workspace @opentoolmesh/shared
npm run build --workspace @opentoolmesh/sdk
npm run build --workspace @opentoolmesh/tool-node
PORT=4318 node services/tool-node/dist/services/tool-node/src/server.js
```

成功标志：

```text
OpenTool Mesh tool node listening on http://127.0.0.1:4318
```

可达性检查：

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:4318/invokeTool
```

预期返回 `404`。这里的 `404` 不是故障，而是因为健康探测使用了 `GET`，而服务只接受 `POST /invokeTool`。

### 5.3 终端 C：publish / discover / call / trace

CLI 当前已有 `dist`，但 `audit-agent` 仍需先构建。

先构建缺失项：

```bash
cd /workspace/project
npm run build --workspace @opentoolmesh/cli
npm run build --workspace @opentoolmesh/audit-agent
```

发布：

```bash
node packages/cli/dist/cli/src/index.js publish --manifest manifests/solidity-pattern-scanner.manifest.json
```

按 capability 发现：

```bash
node packages/cli/dist/cli/src/index.js discover --capability solidity-static-analysis
```

按 ENS 名解析：

```bash
node packages/cli/dist/cli/src/index.js resolve --tool solidity-scanner.auditagent.eth
```

远程调用：

```bash
node packages/cli/dist/cli/src/index.js call --tool solidity-scanner.auditagent.eth --input examples/audit-agent/fixtures/sample-contract-input.json
```

完整 audit run：

```bash
node examples/audit-agent/dist/examples/audit-agent/src/run-audit.js
```

### 5.4 运行时产物位置

一旦 `publish` 或 `call` 真正执行，本地 devnet 会自动创建：

- `/workspace/project/.opentoolmesh/ens-records.json`
- `/workspace/project/.opentoolmesh/axl-peers.json`
- `/workspace/project/.opentoolmesh/storage/manifests/*.json`
- `/workspace/project/.opentoolmesh/storage/traces/*.json`
- `/workspace/project/.opentoolmesh/storage/reports/*.json`
- `/workspace/project/.opentoolmesh/storage/artifacts/*.json`

这些文件是“运行后证据”，不是仓库静态前置条件。

## 6. 建议执行顺序

### 6.1 彩排前 5 分钟

```bash
cd /workspace/project
bash docs/demo/demo-prereflight.sh
```

目标：

- 确认 `node` 版本
- 确认 manifest、源码入口、前端健康接口文件存在
- 识别 `node_modules` 与 `dist` 是否缺失
- 提前判断 demo 只能走“实时演示”还是“静态回放”

### 6.2 彩排前 2 分钟

```bash
cd /workspace/project
bash docs/demo/demo-health-check.sh
```

目标：

- 若 dashboard 已启动，验证 `3000/api/health`
- 若 tool-node 已启动，验证 `4318/invokeTool`
- 若任一服务未启动，立即给出缺失项

### 6.3 正式演示

推荐顺序：

1. dashboard 打开页面，只承担解释字段结构
2. tool-node 单独进程启动，证明 remote node 独立存在
3. 终端执行 `publish`
4. 终端执行 `discover`
5. 终端执行 `resolve`
6. 终端执行 `call` 或 `run-audit`
7. 打开 `.opentoolmesh/storage/traces/*.json` 与 `reports/*.json` 讲 provenance

## 7. 健康检查定义

### 7.1 dashboard

- URL：`http://127.0.0.1:3000/api/health`
- 成功标准：HTTP `200`
- 失败处理：
  - 若连接失败：先检查 `apps/dashboard/node_modules`
  - 若 `npm run dev` 已启动仍失败：看终端报错，优先处理依赖缺失或端口占用

### 7.2 tool-node

- URL：`http://127.0.0.1:4318/invokeTool`
- 成功标准：HTTP `404` 或 `400`
- 原因：该服务没有独立 `/health`，而 `/invokeTool` 只接受 `POST`
- 失败处理：
  - 连接失败：确认 `PORT=4318 node services/tool-node/dist/services/tool-node/src/server.js` 是否还活着
  - 若端口变更：同步更新 `.opentoolmesh/axl-peers.json`

## 8. 故障兜底

### 8.1 dashboard 起不来

兜底方案：

- 保留浏览器说明口径，但不阻塞主链路
- 直接用终端和 JSON 文件讲 `discover -> verify -> call -> trace -> report`

对外口径：

“dashboard 是展示层，不是链路本身；真实证据以 CLI 输出和 trace/report JSON 为准。”

### 8.2 tool-node 起不来

兜底方案：

- 不强行演示实时远程调用
- 改为展示 `examples/audit-agent/fixtures/sample-execution-trace.json` 的字段结构
- 明确说明当前 blocker 是构建产物或依赖缺失，不是协议设计缺失

### 8.3 CLI 或 audit-agent 缺 dist

兜底方案：

- 明确这是构建前置条件未满足
- 先让 `dev` 任务补齐代码闭环与构建产物
- DevOps 侧继续负责启动顺序、端口约定、健康检查和运行手册

### 8.4 `.opentoolmesh` 目录不存在

这不是故障。它只说明还没跑过 `publish` / `call`。

只有在已经执行过主链路后仍没有生成对应文件，才视为 runtime 异常。

## 9. 演示口径

必须说清楚三点：

- “agent 先按 capability 发现工具，而不是硬编码 endpoint。”
- “tool-node 是独立进程，和 agent 不是同一个函数调用栈。”
- “trace / artifact / report 会在本地 devnet 的 `.opentoolmesh` 下落盘，作为 0G 存储语义的本地替身。”

## 10. 当前结论

当前 `docs/demo` 已经具备：

- 可执行的前置自检脚本
- 可执行的健康检查脚本
- 按仓库现状校准后的启动编排与故障兜底

当前仍依赖其他任务补齐的前置条件：

- workspace 依赖安装
- tool-node、audit-agent 的 `dist` 构建产物
- 闭环 run 真正执行后生成的 `.opentoolmesh` 运行时证据
