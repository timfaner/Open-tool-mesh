# OpenTool Mesh 启动排障
> Troubleshooting OpenTool Mesh Startup

这篇文档收敛首次上手阶段最常见的环境、依赖、测试和 dashboard 启动问题，采用“症状 -> 原因 -> 解决命令”的格式，避免新用户在 README、demo runbook 与源码之间来回跳。

> Use this page to diagnose environment, dependency, test, and dashboard startup issues.

## 使用方式 / How To Use This Page

先定位你看到的症状，再执行对应修复命令；如果问题仍然存在，回到[快速开始 / Quick Start](./quickstart.md)按顺序重新执行。

## 错误 1：`vitest: not found` / Error 1: `vitest: not found`

症状：

- 运行 `corepack pnpm test` 时，终端提示 `vitest: not found`

原因：

- 通常是还没有执行 `corepack pnpm install`
- 或者依赖安装没有成功完成

处理方式：

先重新安装 workspace 依赖，再重新运行 tests。

> Reinstall workspace dependencies and rerun the tests.

```bash
cd /workspace/project
corepack pnpm install
corepack pnpm test
```

## 错误 2：`tsc: not found` / Error 2: `tsc: not found`

症状：

- 运行 `corepack pnpm build` 或 `corepack pnpm demo:run` 时，终端提示 `tsc: not found`

原因：

- 还没有安装 workspace 依赖，就直接执行构建或 demo 脚本

处理方式：

先安装依赖，再重新运行构建或 demo 命令。

> Install dependencies before running build or demo commands.

```bash
cd /workspace/project
corepack pnpm install
corepack pnpm build
corepack pnpm demo:run
```

## 错误 3：Node 版本不足 / Error 3: Node Version Is Too Old

症状：

- `bash docs/demo/demo-prereflight.sh` 输出 `node 版本偏低`
- Next.js、TypeScript 或脚本运行时出现版本不兼容问题

原因：

- 仓库根 `package.json` 要求 Node.js `>= 22.0.0`

处理方式：

先升级 Node.js，再重新执行前置检查与依赖安装。

> Upgrade Node.js to version 22 or newer, then rerun the prereflight check.

```bash
cd /workspace/project
node -v
bash docs/demo/demo-prereflight.sh
corepack pnpm install
```

## 错误 4：dashboard 端口 `3000` 被占用 / Error 4: Dashboard Port `3000` Is Already in Use

症状：

- 执行 `npm run dev -- --hostname 127.0.0.1 --port 3000` 时，终端提示端口已占用

原因：

- 本地已有其他进程占用了 `3000`
- 或你之前启动过 dashboard，旧进程尚未退出

处理方式：

先释放占用端口，或改用其他端口启动 dashboard。

> Stop the conflicting process or start the dashboard on another port.

```bash
cd /workspace/project/apps/dashboard
npm run dev -- --hostname 127.0.0.1 --port 3001
```

成功标志 / Success Signal：

- 终端出现 `Ready`
- 可以通过新端口访问页面，例如 `http://127.0.0.1:3001/`

## 错误 5：dashboard 没有读取到最新运行态数据 / Error 5: Dashboard Did Not Load the Latest Runtime Data

症状：

- 页面能打开，但展示的是 fixture 基线而不是你刚运行的最新数据
- 页面字段与最近一次 `corepack pnpm demo:run` 输出对不上

原因：

- 本地没有成功的 `.opentoolmesh/storage/traces/*.json`
- 最新 trace 不完整，或缺少对应的 artifact / report 文件
- dashboard 按规则回退到了仓库内置 fixture

处理方式：

先重新执行一次完整 demo，再刷新 dashboard 页面。

> Regenerate a successful runtime set with `demo:run`, then reload the dashboard.

```bash
cd /workspace/project
corepack pnpm demo:run
```

补充说明：

- dashboard 会优先读取最新成功 trace
- 只有没有可用成功运行态时，才允许回退到 fixture
- 详细规则见 [Dashboard Runtime Data Source](../../apps/dashboard/lib/runtime-data-source.md)

## 错误 6：健康检查失败 / Error 6: Health Check Failed

症状：

- 执行 `bash docs/demo/demo-health-check.sh` 时，dashboard 或 tool node 返回非 `200`

原因：

- 服务尚未真正 ready
- 对应进程还没启动，或已经退出

处理方式：

根据你要检查的服务，重新启动 dashboard 或 tool node。

> Restart the target service and retry the health check.

```bash
cd /workspace/project/apps/dashboard
npm run dev -- --hostname 127.0.0.1 --port 3000
```

如果你还需要单独启动 tool node：

> Start the remote tool node from the repository root.

```bash
cd /workspace/project
corepack pnpm demo:tool-node
```

## 仍未解决 / Still Stuck

如果以上问题都不匹配，按下面顺序回到主线重新检查：

1. 执行 `bash docs/demo/demo-prereflight.sh`
2. 执行 `corepack pnpm install`
3. 执行 `corepack pnpm test`
4. 启动 dashboard
5. 如需验证完整链路，再执行 `corepack pnpm demo:run`

## 下一步阅读 / Next Steps

- 回到[快速开始 / Quick Start](./quickstart.md)
- 继续查看[Demo Runbook](../demo/opentool-mesh-demo-runbook.md)
- 返回[开始使用索引 / Getting Started Index](./README.md)
