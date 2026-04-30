# Demo 文档索引

> 中文主文档 | Demo Docs Overview

本目录服务于“如何把 OpenTool Mesh 真实跑起来”这一件事。默认假设你已经在仓库根目录执行过依赖安装，或至少先看过 [根 README](../../README.md) 的快速开始。

## 这组文档解决什么问题

- 一键跑完整演示链路时，应该执行什么命令
- 分步骤演示时，dashboard、tool node、publish、audit agent 的顺序是什么
- 成功后应该看到哪些输出字段与运行时文件
- 这些 demo 文档与 `examples/audit-agent` 的示例代码是什么关系

## 阅读顺序

1. [opentool-mesh-demo-runbook.md](./opentool-mesh-demo-runbook.md)
   适合第一次运行仓库，覆盖一键执行、分步执行、dashboard 对齐口径与闭环检查项。
2. `demo-prereflight.sh`
   适合先做环境前置检查，确认关键文件、Node 版本与构建产物状态。
3. `demo-health-check.sh`
   适合在 dashboard 与 tool node 已启动后确认服务存活。
4. [examples/audit-agent/README.md](../../examples/audit-agent/README.md)
   适合想继续看“示例 agent 到底做了什么”的读者。

## 最短运行方式

```bash
cd /workspace/project
corepack pnpm install
corepack pnpm demo:run
```

如果你更希望拆步演示：

```bash
cd /workspace/project
corepack pnpm demo:tool-node
corepack pnpm demo:publish
corepack pnpm demo:audit-agent
```

## 与主系统的关系

`docs/demo` 负责说明“怎么跑”；`examples/audit-agent` 负责展示“一个 agent 如何消费这套能力”；`apps/dashboard` 负责展示“跑完以后如何复盘证据链”。三者共同对应主系统中的调用闭环，而不是互相独立的孤立 demo。
