# Audit Agent 示例说明

> 中文主文档 | Audit Agent Example

`examples/audit-agent` 是一个参考接入方示例，用来演示“一个 agent 如何使用 OpenTool Mesh 提供的发现、校验、调用、留痕与报告能力”。它不是 SDK 内核，也不是生产级审计系统，而是主系统闭环的最小可运行消费者。

## 示例目的（Purpose）

这个示例主要回答四个问题：

1. Agent 如何按 capability 发现可用工具
2. 发现到工具后，如何解析身份并加载 manifest
3. 调用前如何执行 manifest 校验
4. 调用完成后，如何生成 trace 与 audit report

## 运行方式（How to Run）

推荐从仓库根目录运行：

```bash
cd /workspace/project
corepack pnpm install
corepack pnpm demo:publish
corepack pnpm demo:audit-agent
```

如果希望由脚本自动准备 tool node、publish 与 seed，也可以直接运行：

```bash
cd /workspace/project
corepack pnpm demo:run
```

如果只想单测这个示例包：

```bash
cd /workspace/project
corepack pnpm --filter @opentoolmesh/audit-agent test
```

## 输入与输出（Input / Output）

默认输入：

- 合约源码：`fixtures/sample-contract.sol`
- 目标 capability：`solidity-static-analysis`

运行过程中会生成或引用：

- invocation request artifact
- invocation response artifact
- tool output artifact
- execution trace
- audit report

命令成功后，终端输出会包含：

- `requestedCapability`
- `toolId`
- `manifestUri`
- `verification`
- `traceId`
- `traceUri`
- `reportUri`

## 关键文件（Key Files）

| 路径 | 作用 |
| --- | --- |
| `src/run-audit.ts` | 示例主入口，串起 discover / resolve / verify / invoke / trace / report |
| `src/capabilities/required-capabilities.ts` | 声明示例关注的 capability |
| `src/report/build-report.ts` | 报告构建相关 scaffold |
| `fixtures/` | 示例输入与 dashboard 回退所需的基线数据 |
| `tests/run-audit.test.ts` | 校验 trace 语义与关键字段 |

## 适用场景（When to Use）

适合：

- 新用户理解主系统最短调用链
- 贡献者定位 agent 侧接入入口
- 演示 dashboard 数据与 runtime trace 的来源

不适合：

- 作为完整审计框架使用
- 代表生产环境下的安全扫描能力

## 与主系统的关系

- 它消费 `packages/sdk` 提供的 client API
- 它依赖已发布的 tool manifest 与 capability index
- 它调用 `services/tool-node` 暴露的远程执行入口
- 它生成的 trace / report 会被 `apps/dashboard` 优先读取并展示

如果你先看文档再看代码，建议顺序是：

1. [根 README](../../README.md)
2. [Demo Runbook](../../docs/demo/opentool-mesh-demo-runbook.md)
3. `src/run-audit.ts`
