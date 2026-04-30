# 文档导航
> Documentation Map for OpenTool Mesh

本页是 `docs/` 的总索引，帮助第一次进入文档目录的读者按顺序继续阅读，而不是在子目录之间来回跳转。

> Start here to choose the right reading path across the `docs/` directory.

## 推荐阅读顺序 / Recommended Reading Order

如果你是第一次接触这个项目，建议按下面顺序阅读：

1. 先回到[仓库根 README](../README.md)，完成项目定位、环境要求与最短启动命令的确认。
2. 再看[开始使用 / Getting Started](./getting-started/README.md)，按顺序完成环境准备、依赖安装、测试验证与 dashboard 启动。
3. 然后进入[演示文档 / Demo Docs](./demo/README.md)，跑通 `publish -> discover -> verify -> call -> trace -> report` 的最小闭环。
4. 接着看[架构文档 / Architecture Docs](./architecture/)，理解 CLI、SDK、tool node、example agent 与 dashboard 的真实职责边界。
5. 最后看[产品说明 / Product Docs](./product/opentool-mesh-产品说明与验收边界.md)，确认项目范围、对外叙事与验收边界。

## 按读者入口阅读 / Entry Points by Reader Type

### 我想先跑起来 / I Want to Run the Project First

优先阅读：

- [Demo 文档索引 / Demo Docs](./demo/README.md)
- [完整 Demo Runbook](./demo/opentool-mesh-demo-runbook.md)
- [审计示例 / Audit Agent Example](../examples/audit-agent/README.md)

这条路径适合想先确认仓库可运行、再回头理解实现细节的读者。

> Best for readers who want a working demo before studying internals.

### 我想理解系统怎么组成 / I Want to Understand the System

优先阅读：

- [架构目录 / Architecture Directory](./architecture/)
- [架构文档导航 / Architecture Docs](./architecture/README.md)
- [系统总览 / System Overview](./architecture/system-overview.md)
- [模块接口说明](./architecture/module-interfaces.md)
- [Manifest Schema](./architecture/manifest-schema.md)
- [Trace Schema](./architecture/trace-schema.md)

这条路径适合贡献者、维护者和需要快速建立代码地图的开发者。

> Best for contributors who need the real module boundary and call chain.

### 我想确认项目边界与定位 / I Want Scope and Product Context

优先阅读：

- [产品说明与验收边界](./product/opentool-mesh-产品说明与验收边界.md)
- [仓库根 README](../README.md)

这条路径适合想先判断项目价值、黑客松范围和不做什么的人。

> Best for readers evaluating the project's purpose, scope, and constraints.

## 文档目录职责 / What Each Directory Is For

| 路径 | 作用 |
| --- | --- |
| [`docs/getting-started/`](./getting-started/README.md) | 面向首次上手用户的正式入口，包含索引、快速开始与常见错误排查，帮助新读者先完成环境准备、依赖安装、测试验证与 dashboard 启动。 |
| [`docs/demo/`](./demo/README.md) | 解释如何实际运行 demo、如何做前置检查、如何确认 dashboard 与 tool node 的健康状态。 |
| [`docs/architecture/`](./architecture/) | 解释系统边界、模块职责、关键 schema 和真实调用链，服务贡献者理解当前实现。 |
| [`docs/product/`](./product/opentool-mesh-产品说明与验收边界.md) | 解释项目定位、目标用户、叙事边界与 MVP 验收范围，避免产品定义漂移。 |

## 核心文档入口 / Core Document Links

- [开始使用 / Getting Started](./getting-started/README.md)
- [快速开始 / Quick Start](./getting-started/quickstart.md)
- [常见错误与排查 / Troubleshooting](./getting-started/troubleshooting.md)
- [Demo 文档索引 / Demo Docs](./demo/README.md)
- [完整 Demo Runbook / Demo Runbook](./demo/opentool-mesh-demo-runbook.md)
- [架构目录 / Architecture Directory](./architecture/)
- [架构文档导航 / Architecture Docs](./architecture/README.md)
- [产品说明与验收边界 / Product Scope](./product/opentool-mesh-产品说明与验收边界.md)
- [审计示例说明 / Audit Agent Example](../examples/audit-agent/README.md)

## 从这里继续 / Where to Go Next

如果你还没有跑过项目，下一步先进入[开始使用 / Getting Started](./getting-started/README.md)。

如果你已经完成快速开始并跑通 demo，下一步进入[架构目录](./architecture/) 看系统边界与调用链。

如果你正在判断项目是否符合预期，下一步进入[产品说明与验收边界](./product/opentool-mesh-产品说明与验收边界.md)。
