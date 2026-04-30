# 模块边界
> Module Boundaries

本页描述当前仓库中各目录的职责、依赖方向与越层规则。目标不是抽象一套理想分层，而是说明“现有代码里哪些逻辑应该放在哪里”。

> This page documents the actual module boundaries in the current repository.

## 目录职责 / Package Responsibilities

### `packages/shared`

职责：

- 定义跨模块共享的类型契约
- 作为 manifest、invocation、trace、report 的唯一类型来源

不应承载：

- storage、network、CLI、UI、业务编排逻辑

### `packages/sdk`

职责：

- 组合 ENS、blob storage、KV、transport adapters
- 暴露 `resolveIdentity`、`discoverTools`、`loadManifest`、`verifyManifest`、`invokeTool`、`recordTrace`、`publishManifest`、`buildAuditReport`
- 提供 `local-devnet.ts` 里的本地 adapter 与 hash 工具

不应承载：

- CLI 专属参数解析
- dashboard 视图模型
- tool node 具体扫描规则

### `packages/cli`

职责：

- 把 SDK 能力暴露为 `publish`、`resolve`、`discover`、`verify`、`call`、`trace` 命令
- 处理命令参数、stdout 输出、文件读取
- 在 `publishAndIndexManifest()` 中补 capability index 写入

不应承载：

- 重复实现 SDK 领域逻辑
- 绕过 SDK 直接操作 `.opentoolmesh/` 状态

### `services/tool-node`

职责：

- 提供工具执行 HTTP 入口
- 将 `otm.tool.invoke` envelope 转换为工具函数调用
- 返回 `otm.tool.result` envelope

不应承载：

- capability discovery
- manifest verification
- trace persistence

### `examples/audit-agent`

职责：

- 作为参考接入方示例，演示 agent 侧完整消费链路
- 生成 audit report 和 trace artifact

不应承载：

- 共享基础设施
- 被其他模块依赖的公共库逻辑

### `apps/dashboard`

职责：

- 读取 trace、report、artifact 与 manifest 衍生信息
- 将一次 demo run 解释成页面叙事
- 在 runtime 数据不完整时回退到 fixture

不应承载：

- 发布或调用工具
- 写入运行时状态

## 真实依赖方向 / Actual Dependency Direction

当前仓库的主要依赖关系可以概括为：

```text
packages/shared
  -> packages/sdk
  -> services/tool-node

packages/sdk
  -> packages/cli
  -> examples/audit-agent

runtime artifacts from sdk / cli / audit-agent
  -> apps/dashboard
```

含义如下：

- `shared` 是所有跨模块数据结构的起点。
- `sdk` 是运行时编排核心，CLI 与示例 agent 都应该优先复用它。
- `tool-node` 只共享 contract，不反向依赖 SDK。
- `dashboard` 主要消费运行结果，而不是直接参与调用链。

## 边界上的关键事实 / Important Boundary Facts

### 发布索引不完全在 SDK 内

`client.publishManifest()` 只负责持久化 manifest 并更新 ENS text records。capability index 由 CLI helper `publishAndIndexManifest()` 调用 `seedCapabilityIndex()` 单独补齐。

这意味着：

- 发布动作会写三类状态：storage、ENS records、KV index
- 当前“发布完成”的定义跨越 SDK 与 CLI 两层

### `verifyManifest()` 是 MVP 校验

`packages/sdk/src/client/create-client.ts` 当前只做最小必要校验：

- manifest hash 是否匹配
- owner address 是否与 ENS owner 一致
- schemaVersion / protocol / transport 是否符合当前约束
- `sdkVersionRange` 是否以 `^0.1` 开头

这是一段最小闭环实现，不应被文档描述成生产级验证系统。

### dashboard 是只读解释层

`apps/dashboard/lib/demo-run.ts` 不负责发起调用，也不写回状态。它只读取 runtime trace，并验证：

- 有最新成功 trace
- 有同一 `traceId` 的 `tool-output` artifact
- 有同一 `traceId` 的 `audit-report` artifact

不满足时才回退到 fixture baseline。

## 越层规则 / Layering Rules

以下规则有助于保持当前仓库继续可维护：

1. 新的共享 schema 先放 `packages/shared`，再由 SDK、CLI、tool node、dashboard 消费。
2. 新的 discovery、verification、trace、report 编排逻辑先放 SDK，而不是复制进 CLI 或 example。
3. CLI 负责参数和输出格式，不负责发明新的存储协议。
4. tool node 只实现被调用工具能力，不理解 capability index 或 dashboard 叙事。
5. dashboard 只解释已有 runtime 数据，不反向定义 runtime contract。

## 推荐阅读源码 / Source Files Worth Reading

- `packages/shared/src/manifest.ts`
- `packages/shared/src/invocation.ts`
- `packages/shared/src/trace.ts`
- `packages/sdk/src/client/create-client.ts`
- `packages/sdk/src/client/local-devnet.ts`
- `packages/cli/src/commands/helpers.ts`
- `services/tool-node/src/server.ts`
- `examples/audit-agent/src/run-audit.ts`
- `apps/dashboard/lib/demo-run.ts`
