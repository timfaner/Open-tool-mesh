# 开始使用 OpenTool Mesh
> Getting Started with OpenTool Mesh

这组文档面向第一次接触仓库的开发者，目标是在 10 到 15 分钟内完成环境准备、依赖安装、测试验证、dashboard 启动，以及常见启动问题排查。

> Prepare the environment, install dependencies, run tests, start the dashboard, and troubleshoot common startup issues in 10-15 minutes.

## 你会得到什么 / What You Will Accomplish

- 确认本地 Node.js、`corepack` 与仓库目录满足要求
- 在仓库根目录安装 workspace 依赖
- 运行 workspace tests，验证代码库处于可用状态
- 单独启动 dashboard，并知道如何检查服务是否 ready
- 在遇到常见错误时，能直接跳到对应排障文档

## 推荐阅读顺序 / Recommended Reading Order

1. 先读[快速开始 / Quick Start](./quickstart.md)，按顺序完成第一次上手。
2. 遇到环境或命令问题时，跳转到[常见错误与排查 / Troubleshooting](./troubleshooting.md)。
3. 想继续跑完整演示链路时，阅读[Demo 文档索引 / Demo Docs](../demo/README.md)。
4. 想理解系统为什么这样组织时，继续阅读[架构文档导航 / Architecture Docs](../architecture/README.md)，再进入[系统总览 / System Overview](../architecture/system-overview.md)。

## 文档分工 / Document Roles

### [快速开始 / Quick Start](./quickstart.md)

覆盖第一次上手所需的最短路径：环境准备、安装依赖、运行 tests、运行 dashboard、成功标志，以及下一步该看什么。

### [常见错误与排查 / Troubleshooting](./troubleshooting.md)

收敛启动阶段最容易遇到的报错与症状，包括 `vitest: not found`、`tsc: not found`、Node 版本不足、dashboard 端口占用和 dashboard 没有读到最新运行态数据。

## 下一步阅读 / Next Steps

- 想先跑通完整闭环：阅读[Demo Runbook](../demo/opentool-mesh-demo-runbook.md)
- 想理解示例 agent 如何消费这套能力：阅读[Audit Agent 示例说明](../../examples/audit-agent/README.md)
- 想理解 CLI、SDK、tool node、dashboard 的关系：先读[架构文档导航 / Architecture Docs](../architecture/README.md)，再读[系统总览 / System Overview](../architecture/system-overview.md)
