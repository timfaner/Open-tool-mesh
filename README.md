# OpenTool Mesh

> 中文主文档 | Chinese README  
> English labels are provided in key headings for quick scanning.

OpenTool Mesh 是一个面向 Agent 工具调用场景的开源 MVP：它把远程工具发布、能力发现、Manifest 校验、远程调用、Trace 留痕与审计报告串成一条可复现闭环。

当前仓库最适合两类读者：

- 想快速跑通一条 `publish -> discover -> verify -> call -> trace -> report` 演示链路的开发者
- 想理解 CLI、SDK、tool node、example agent、dashboard 如何协作的贡献者

## 项目价值（Why This Repo Exists）

这个仓库关注的不是“做一个工具市场”，而是验证一条可运行的工具调用基础链路：

1. 用 manifest 描述工具能力与调用入口
2. 通过 capability index + ENS 风格身份解析发现工具
3. 在调用前校验 manifest 与身份绑定关系
4. 通过远程 tool node 执行调用
5. 把请求、响应、tool output、trace、report 落盘为可审计证据
6. 在 dashboard 中复盘一次真实运行

## 快速开始 / Quick Start

所有命令默认在仓库根目录执行：

```bash
cd /workspace/project
corepack pnpm install
corepack pnpm test
corepack pnpm demo:run
```

环境前提：

- Node.js `>= 22`
- `corepack` 可用

成功信号：

- `corepack pnpm test` 通过 workspace 测试
- `corepack pnpm demo:run` 输出 `manifestUri`、`traceId`、`traceUri`、`reportUri`
- 本地生成 `.opentoolmesh/` 运行时目录，包含 traces / artifacts / reports / manifests

如果你想先检查环境，再决定是否启动服务，可执行：

```bash
bash docs/demo/demo-prereflight.sh
```

详细版安装、测试、dashboard 启动与错误排查，请直接阅读[开始使用 / Getting Started](./docs/getting-started/README.md)。

## 常用命令 / Common Commands

```bash
corepack pnpm install
corepack pnpm build
corepack pnpm test
corepack pnpm typecheck
corepack pnpm demo:publish
corepack pnpm demo:tool-node
corepack pnpm demo:audit-agent
corepack pnpm demo:run
```

单独启动 dashboard：

```bash
cd apps/dashboard
npm run dev -- --hostname 127.0.0.1 --port 3000
```

服务健康检查：

```bash
bash docs/demo/demo-health-check.sh
```

## 仓库结构 / Repository Map

| 路径 | 作用 |
| --- | --- |
| `packages/shared` | 共享类型与 schema 契约 |
| `packages/sdk` | 核心运行时编排，负责 discover / resolve / verify / invoke / trace |
| `packages/cli` | `opentool` CLI 命令入口 |
| `services/tool-node` | 远程工具执行服务，暴露 `/health` 与 `/invokeTool` |
| `examples/audit-agent` | 参考接入方示例，演示 agent 如何消费远程能力 |
| `apps/dashboard` | 只读 dashboard，用于复盘最近一次 demo 运行 |
| `docs/demo` | 演示说明、前置检查与健康检查脚本 |
| `docs/architecture` | 架构总览、接口与 schema 说明 |

## 推荐阅读路径 / Reading Path

1. 先读本文，了解项目目标与最快上手命令
2. 再读 [开始使用 / Getting Started](./docs/getting-started/README.md)，按顺序完成环境准备、tests 与 dashboard 启动
3. 想跑完整演示时，读 [Demo 文档索引 / Demo Docs](./docs/demo/README.md)，选择一键运行或分步演示
4. 如需理解系统边界，读 [架构文档导航](./docs/architecture/README.md)
5. 如需理解真实调用链，读 [审计示例说明](./examples/audit-agent/README.md) 与 `examples/audit-agent/src/run-audit.ts`

## 文档入口 / Documentation Index

- [开始使用 / Getting Started](./docs/getting-started/README.md)
- [快速开始 / Quick Start](./docs/getting-started/quickstart.md)
- [常见错误与排查 / Troubleshooting](./docs/getting-started/troubleshooting.md)
- [贡献指南 / Contributing Guide](./CONTRIBUTING.md)
- [Demo 文档索引 / Demo Docs](./docs/demo/README.md)
- [术语表与命令速查 / Glossary and Command Quick Reference](./docs/reference/glossary-and-command-quick-reference.md)
- [完整 Demo Runbook](./docs/demo/opentool-mesh-demo-runbook.md)
- [审计示例说明 / Audit Agent Example](./examples/audit-agent/README.md)
- [产品说明与验收边界](./docs/product/opentool-mesh-产品说明与验收边界.md)
- [架构文档导航](./docs/architecture/README.md)
- [系统总览 / System Overview](./docs/architecture/system-overview.md)
- [模块接口说明](./docs/architecture/module-interfaces.md)
- [Manifest Schema](./docs/architecture/manifest-schema.md)
- [Trace Schema](./docs/architecture/trace-schema.md)
- [参考资料 / Reference Docs](./docs/reference/README.md)

## 架构导航 / Architecture Navigation

按当前代码现状，最值得优先理解的是这几条真实路径：

- 发布链路：manifest JSON -> `demo:publish` -> 本地 storage + ENS 风格记录 + capability index
- 调用链路：`discover -> resolve -> loadManifest -> verify -> invokeTool -> recordTrace -> buildAuditReport`
- 展示链路：dashboard 优先读取最新成功 trace，找不到时回退到 fixtures

如果你要顺着代码走：

- Agent 视角入口：`examples/audit-agent/src/run-audit.ts`
- CLI 视角入口：`packages/cli/src/index.ts`
- Tool node 入口：`services/tool-node/src/server.ts`
- Dashboard 读路径入口：`apps/dashboard/lib/demo-run.ts`

## 贡献方式 / Contributing

当前最适合的贡献方向：

- 跑通 demo，确认 README 与 docs 是否足以支持首次上手
- 对齐架构文档与真实代码实现，补齐占位 schema 文档
- 改进 CLI、SDK、tool node、dashboard 的说明与测试

建议贡献流程：

```bash
corepack pnpm install
corepack pnpm test
corepack pnpm demo:run
```

首次贡献前，建议先阅读[贡献指南 / Contributing Guide](./CONTRIBUTING.md)。其中整理了环境准备、文档与代码改动要求、提交前最小验证，以及 PR 描述建议。

在提交前，至少确认：

- 改动涉及的文档链接有效
- 命令在仓库根路径可执行
- 若修改运行链路，相关测试或最小 demo 验证已完成

## 常见问题 / Troubleshooting

`vitest: not found`

- 原因：通常是还没执行 `corepack pnpm install`
- 处理：先安装依赖，再重新运行 `corepack pnpm test`

`tsc: not found`

- 原因：通常是还没安装 workspace 依赖就直接运行构建或 demo
- 处理：先执行 `corepack pnpm install`，再运行 `corepack pnpm build` 或 `corepack pnpm demo:run`

更多启动排障场景见[常见错误与排查 / Troubleshooting](./docs/getting-started/troubleshooting.md)。
