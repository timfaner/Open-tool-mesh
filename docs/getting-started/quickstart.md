# OpenTool Mesh 快速开始
> Quick Start for OpenTool Mesh

这篇文档只覆盖第一次上手所需的最短成功路径：准备环境、安装依赖、运行 tests、启动 dashboard，并确认你已经具备继续阅读 demo 与 architecture 文档的基础。

> Follow the shortest path to prepare the environment, install dependencies, run tests, and start the dashboard.

## 适用对象 / Who This Is For

- 第一次克隆仓库、想确认项目能否在本地跑通的开发者
- 想先验证测试与 dashboard，而不是立刻拆读源码的贡献者

## 前置条件 / Prerequisites

需要满足以下条件：

- Node.js `>= 22`
- `corepack` 可用
- 已经进入仓库根目录 `/workspace/project`

你可以先做一次前置检查。

> Run a quick prereflight check before installing dependencies.

```bash
cd /workspace/project
bash docs/demo/demo-prereflight.sh
```

成功标志 / Success Signal：

- 输出中出现 `node 版本满足要求`
- 输出中没有 `缺少文件` 这类失败项

失败时检查 / If It Fails：

- Node 版本低于 `22` 时，先升级 Node.js 再继续
- `corepack` 不可用时，先确认当前 Node 安装是否包含 `corepack`

## 步骤 1：安装依赖 / Step 1: Install Dependencies

先在仓库根目录安装整个 workspace 的依赖。

> Install workspace dependencies from the repository root.

```bash
cd /workspace/project
corepack pnpm install
```

成功标志 / Success Signal：

- 安装完成且没有 `ERR_PNPM_*` 报错
- 根目录与各 package/app 下生成依赖所需的 `node_modules`

失败时检查 / If It Fails：

- 如果 `corepack pnpm` 不可用，先执行前面的前置检查
- 如果网络或包管理器异常，重新执行安装并保留原始错误信息

## 步骤 2：运行测试 / Step 2: Run Tests

安装依赖后，先运行 workspace tests，确认仓库当前状态可用。

> Run workspace tests before starting individual services.

```bash
cd /workspace/project
corepack pnpm test
```

成功标志 / Success Signal：

- 所有 workspace 测试通过
- 终端中不再出现 `vitest: not found`

失败时检查 / If It Fails：

- 如果报 `vitest: not found`，说明依赖没有正确安装；见[常见错误与排查](./troubleshooting.md#错误-1vitest-not-found--error-1-vitest-not-found)
- 如果是某个包测试失败，优先确认你是否在干净依赖状态下运行

## 步骤 3：启动 dashboard / Step 3: Start the Dashboard

dashboard 是一个独立的 Next.js app，用于复盘最近一次成功的 demo 运行；如果本地没有成功运行态，它会回退到仓库内置 fixture。

> Start the dashboard to inspect the latest successful demo run or the bundled fallback fixtures.

```bash
cd /workspace/project/apps/dashboard
npm run dev -- --hostname 127.0.0.1 --port 3000
```

成功标志 / Success Signal：

- 终端出现 `Ready` 或 `✓ Ready in ...`
- 打开 `http://127.0.0.1:3000/` 可以看到 dashboard 页面
- `http://127.0.0.1:3000/api/health` 返回 `200`

失败时检查 / If It Fails：

- 如果端口 `3000` 已被占用，见[dashboard 端口占用](./troubleshooting.md#错误-4dashboard-端口-3000-被占用--error-4-dashboard-port-3000-is-already-in-use)
- 如果 dashboard 没有展示最新运行态数据，见[dashboard 回退到 fixture](./troubleshooting.md#错误-5dashboard-没有读取到最新运行态数据--error-5-dashboard-did-not-load-the-latest-runtime-data)

## 步骤 4：确认健康状态 / Step 4: Check Service Health

如果 dashboard 已经启动，可以额外执行健康检查确认进程存活。

> Verify the dashboard health endpoint after the dev server is ready.

```bash
cd /workspace/project
bash docs/demo/demo-health-check.sh
```

成功标志 / Success Signal：

- dashboard 健康检查返回 `200`
- 如果 tool node 也已启动，脚本会同时检查 `http://127.0.0.1:4318/health`

失败时检查 / If It Fails：

- 仅启动了 dashboard、未启动 tool node 时，tool node 检查失败是预期现象
- 如果 dashboard 检查失败，先回到上一步确认 dev server 是否真正 ready

## 接下来可以做什么 / What To Do Next

如果你只想验证仓库健康，到这里已经足够。接下来通常有两条路径：

- 想跑完整闭环：阅读[Demo Runbook](../demo/opentool-mesh-demo-runbook.md)，执行 `corepack pnpm demo:run`
- 想理解代码结构：阅读[Demo 文档索引](../demo/README.md) 与[架构总览](../architecture/opentool-mesh-mvp-architecture.md)

## 下一步阅读 / Next Steps

- 继续查看[常见错误与排查 / Troubleshooting](./troubleshooting.md)
- 继续查看[Demo 文档索引 / Demo Docs](../demo/README.md)
- 返回[开始使用索引 / Getting Started Index](./README.md)
