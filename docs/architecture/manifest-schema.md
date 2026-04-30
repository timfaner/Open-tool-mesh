# Manifest 契约参考
> Manifest Contract Reference

本文基于当前仓库真实实现，说明 `ToolManifest`、`ToolIdentity`、`CapabilityIndexEntry` 这三类 manifest 相关契约，以及它们在 CLI、SDK、tool node、audit-agent、dashboard 之间如何发布、解析、校验与消费。

> This document describes the manifest-related contracts that exist in the repository today, and how they are published, resolved, verified, and consumed across the CLI, SDK, tool node, audit-agent, and dashboard.

## 文档定位 / Position In The Doc Set

建议先阅读：

1. [系统总览 / System Overview](./system-overview.md)
2. [模块边界 / Module Boundaries](./module-boundaries.md)
3. [运行时生命周期 / Runtime Lifecycle](./runtime-lifecycle.md)

再回到本文，把 manifest 当作 `publish -> discover -> verify -> call -> trace -> report` 闭环里的“工具事实来源”，而不是一份孤立 JSON 模板。

> Read the overview, module boundaries, and runtime lifecycle first. Then come back here and treat the manifest as the concrete tool contract used by the runtime loop, not as a standalone JSON template.

## 事实来源 / Source Of Truth

manifest 相关的单一类型事实主要集中在以下位置：

- manifest / identity / capability index 类型定义： [packages/shared/src/manifest.ts](/workspace/project/packages/shared/src/manifest.ts:1)
- SDK 解析、校验、发布实现： [packages/sdk/src/client/create-client.ts](/workspace/project/packages/sdk/src/client/create-client.ts:49)
- manifest hash 与本地 devnet 持久化： [packages/sdk/src/client/local-devnet.ts](/workspace/project/packages/sdk/src/client/local-devnet.ts:1)
- CLI 读取与发布 helper： [packages/cli/src/commands/helpers.ts](/workspace/project/packages/cli/src/commands/helpers.ts:1)
- CLI 发布入口： [packages/cli/src/commands/publish.ts](/workspace/project/packages/cli/src/commands/publish.ts:1)
- CLI 校验入口： [packages/cli/src/commands/verify.ts](/workspace/project/packages/cli/src/commands/verify.ts:1)
- 示例 manifest： [services/tool-node/manifests/solidity-pattern-scanner.manifest.json](/workspace/project/services/tool-node/manifests/solidity-pattern-scanner.manifest.json:1)
- agent 示例加载 manifest： [examples/audit-agent/src/run-audit.ts](/workspace/project/examples/audit-agent/src/run-audit.ts:137)

## Manifest 在系统里的角色 / What The Manifest Is For

当前仓库里，manifest 不是单纯给 tool node 自述能力的静态元数据，它同时承担四个角色：

- 作为工具能力的发布载体，描述 `toolId`、capability、MCP schema、invocation 参数和存储命名空间。
- 作为 CLI、SDK、audit-agent 调用前的校验对象，决定输入输出 schema 和 transport 参数。
- 作为 ENS text records 与 capability index 背后的事实源，把“工具是谁”和“这个能力能找到谁”串起来。
- 作为 dashboard 和 trace 的回溯入口，让一次运行可以反查当时实际使用的是哪份 manifest。

> In this repository, the manifest is the runtime contract for publication, verification, invocation setup, and evidence backtracking.

## 三类相关契约 / Three Related Contracts

### `ToolManifest`

`ToolManifest` 是发布到 `0g://manifests/...` 的主文档。它定义工具自身、能力集合、MCP schema、调用配置、兼容性和完整性信息。

### `ToolIdentity`

`ToolIdentity` 不是 manifest 文件本身，而是 `resolveIdentity()` 从 ENS text records 与 ENS owner 解析出来的运行时身份对象。

它把以下信息收敛成调用前需要的最小事实：

- `id`
- `ensName`
- `ownerAddress`
- `latestManifestUri`
- `latestManifestHash`
- `latestVersion`
- `capabilities`

### `CapabilityIndexEntry`

`CapabilityIndexEntry` 是 capability 到工具候选列表的索引对象。它不重复携带完整 manifest，而是保留发现阶段最需要的指针：

- `toolId`
- `ensName`
- `manifestUri`
- `manifestHash`
- `version`
- `ownerAddress`
- `updatedAt`
- `priority?`

这也是为什么当前 discovery 不是单一数据源，而是：

1. KV index 找候选工具
2. ENS text records 解析最新身份
3. blob storage 读取完整 manifest

## `ToolManifest` 顶层结构 / Top-Level Shape

当前 `ToolManifest` 包含以下顶层字段：

| 字段 | 类型 | 含义 |
| --- | --- | --- |
| `schemaVersion` | `"otm.manifest.v1"` | 当前 manifest 契约版本。 |
| `toolId` | `string` | 工具稳定标识，当前采用 `otm:ens:<ens-name>` 形式。 |
| `name` | `string` | 人类可读工具名。 |
| `version` | `string` | 工具版本，当前与发布到本地 devnet 的 blob 文件名绑定。 |
| `description` | `string` | 工具用途说明。 |
| `owner` | object | 工具所有者信息，至少包含 `address`。 |
| `capabilities` | array | 工具声明的 capability 列表。 |
| `mcp` | object | MCP 兼容层的 tool 名称与输入输出 schema。 |
| `invocation` | object | 调用 transport、peerId、method、timeout 等配置。 |
| `storage` | object | manifest 自身 URI、artifact 基址和 trace namespace。 |
| `compatibility` | object | SDK 兼容范围和 manifest API 版本。 |
| `integrity` | object | manifest hash 与创建时间。 |

> The manifest is intentionally compact. It only includes the fields that the current runtime truly consumes.

## 关键字段说明 / Key Fields

### `schemaVersion`

当前 SDK 校验只接受 `otm.manifest.v1`，见 [packages/sdk/src/client/create-client.ts](/workspace/project/packages/sdk/src/client/create-client.ts:105)。

这意味着：

- 文档里不能把它写成开放字符串
- 当前仓库只实现了单一版本分支，没有多版本迁移逻辑

### `toolId`

`toolId` 是当前跨模块里最稳定的工具主键：

- 发布后会进入 capability index
- invocation request 会把它写进请求体
- trace、report、artifact 都会引用它

当前示例值是 `otm:ens:solidity-scanner.auditagent.eth`，见 [services/tool-node/manifests/solidity-pattern-scanner.manifest.json](/workspace/project/services/tool-node/manifests/solidity-pattern-scanner.manifest.json:3)。

### `owner`

`owner.address` 是当前最关键的校验字段。SDK `verifyManifest()` 会把它和 ENS owner 对比：

- 一致则 `ownerValid = true`
- 不一致则直接进入错误列表

`owner.ensName` 当前主要用于补充可读性；`signature` 与 `publicKey` 虽然在类型上预留，但当前代码没有做签名校验。

这点必须明确写出：仓库目前只有 owner 地址一致性检查，没有生产级签名验证。

### `capabilities`

`capabilities[]` 决定两个真实行为：

- CLI 发布后，`seedCapabilityIndex()` 会按 capability 写入 KV 候选列表，见 [packages/sdk/src/client/local-devnet.ts](/workspace/project/packages/sdk/src/client/local-devnet.ts:237)
- 调用方通过 `discoverTools({ capability })` 找到候选工具，见 [packages/sdk/src/client/create-client.ts](/workspace/project/packages/sdk/src/client/create-client.ts:79)

当前示例只声明一个能力：`solidity-static-analysis`。

### `mcp`

`mcp` 段承载的是当前仓库“把远端工具包装成 MCP-compatible tool”所需的最小字段：

- `toolName`
- `protocol`
- `inputSchema`
- `outputSchema`

SDK 当前会直接消费 `inputSchema` 和 `outputSchema`：

- 调用前校验输入
- 返回成功结果后校验输出

同时，`verifyManifest()` 还会要求 `mcp.protocol === "mcp-compatible"`。

### `invocation`

`invocation` 是 runtime 真正使用的 transport 配置：

- `transport`
- `axlPeerId`
- `axlMethod`
- `timeoutMs`
- `regionHint?`

当前校验要求 `transport === "axl"`，但底层 demo transport 并不是真正 AXL 网络，而是本地 HTTP adapter 模拟，见 [packages/sdk/src/client/local-devnet.ts](/workspace/project/packages/sdk/src/client/local-devnet.ts:170)。

这也是当前文档里必须同时说明的两层事实：

- 语义层：调用模型按 AXL envelope 组织
- 实现层：本地 devnet 通过 peer registry + HTTP POST 完成 demo 调用

### `storage`

`storage` 里有三个与运行链路直接相关的字段：

- `manifestUri`
- `artifactBaseUri?`
- `traceNamespace`

当前要注意一个实现细节：

- manifest 文件初始可以写一个预期 URI
- CLI 发布后，`publishManifest()` 会重新写入真实的 `manifestUri`

也就是说，`storage.manifestUri` 不是纯静态字段，而是发布过程会回填的运行结果。

### `compatibility`

当前 SDK 只做最小版本前缀检查：

- `sdkVersionRange.startsWith("^0.1")`
- `manifestApiVersion === "v1"` 作为 manifest 数据的一部分存在，但没有单独复杂协商逻辑

这意味着版本兼容仍是 MVP 级实现，重点在于让调用方知道 manifest 是否面向当前 SDK 主线，而不是完整 semver 解析器。

### `integrity`

`integrity.manifestHash` 是 manifest 最关键的完整性指针：

- CLI 读取本地 manifest 时先用 `hashManifest()` 重算一遍，见 [packages/cli/src/commands/helpers.ts](/workspace/project/packages/cli/src/commands/helpers.ts:32)
- 发布后 SDK 会再次基于回填 URI 的 manifest 生成最终 hash
- 后续 `verifyManifest()` 会把它和 `ToolIdentity.latestManifestHash` 对比

这里的实现事实很重要：

- hash 是对 `manifestHash` 字段清空后的完整 JSON 做 canonical hash
- 因此 hash 包含了 `storage.manifestUri` 等其他字段
- 一旦 manifest 内容或发布后回填值变化，最终 hash 就会变化

## 发布链路 / Publish Flow

当前 manifest 发布链路的最完整入口是 [packages/cli/src/commands/publish.ts](/workspace/project/packages/cli/src/commands/publish.ts:1) 和 [packages/cli/src/commands/helpers.ts](/workspace/project/packages/cli/src/commands/helpers.ts:39)。

真实顺序如下：

1. CLI 从本地 JSON 读取 manifest。
2. `readManifestFromFile()` 先计算一次本地 hash。
3. `publishManifest()` 把 manifest 写入 blob storage。
4. SDK 回填 `storage.manifestUri` 并重算最终 `integrity.manifestHash`。
5. SDK 更新 ENS text records：
   - `opentoolmesh.manifest_uri`
   - `opentoolmesh.manifest_hash`
   - `opentoolmesh.owner`
   - `opentoolmesh.latest_version`
   - `opentoolmesh.capabilities`
6. CLI helper 再调用 `seedCapabilityIndex()` 更新 capability index。

这条边界要特别注意：

- `publishManifest()` 只负责 blob + ENS
- capability index 不在 SDK `publishManifest()` 内部更新
- capability index 的补写发生在 CLI helper，而不是共享 schema 或 tool node

## 发现与解析链路 / Discovery And Resolution Flow

manifest 在调用前不会直接按 `toolId` 读取，而是经过三段解析：

1. `discoverTools({ capability })`
   从 KV 读取 `CapabilityIndexEntry`
2. `resolveIdentity({ ensName })`
   从 ENS text records 读取最新 manifest 指针与 owner
3. `loadManifest({ manifestUri })`
   从 blob storage 拉取完整 `ToolManifest`

示例 agent 的真实用法见 [examples/audit-agent/src/run-audit.ts](/workspace/project/examples/audit-agent/src/run-audit.ts:131)。

这也解释了三个对象的分工：

- `CapabilityIndexEntry` 负责“找谁”
- `ToolIdentity` 负责“这个 ENS 现在指向什么”
- `ToolManifest` 负责“调用时具体按什么契约执行”

## 校验边界 / Verification Boundary

manifest 校验入口在 [packages/sdk/src/client/create-client.ts](/workspace/project/packages/sdk/src/client/create-client.ts:99) 与 [packages/cli/src/commands/verify.ts](/workspace/project/packages/cli/src/commands/verify.ts:1)。

当前真实会检查四件事：

- `manifestHashValid`
- `ownerValid`
- `schemaValid`
- `versionCompatible`

对应判断逻辑是：

- hash 是否等于 ENS 记录中的最新 hash
- `owner.address` 是否等于 ENS owner
- `schemaVersion`、`mcp.protocol`、`invocation.transport` 是否匹配当前固定值
- `sdkVersionRange` 是否以 `^0.1` 开头

当前明确没有实现的内容：

- 数字签名验真
- 细粒度权限模型
- reputation / trust scoring
- 复杂版本协商

> `verifyManifest()` is intentionally minimal. It is a runtime sanity check for the current MVP, not a full production trust system.

## 最小示例 / Minimal Example

下面的 JSON 片段按当前示例 manifest 整理，可作为新贡献者理解 shape 的最小样例：

```json
{
  "schemaVersion": "otm.manifest.v1",
  "toolId": "otm:ens:solidity-scanner.auditagent.eth",
  "name": "Solidity Pattern Scanner",
  "version": "0.1.0",
  "description": "Remote static analysis tool for Solidity contracts",
  "owner": {
    "address": "0x1234567890abcdef1234567890abcdef12345678",
    "ensName": "auditagent.eth"
  },
  "capabilities": [
    {
      "id": "solidity-static-analysis",
      "description": "Detect common Solidity patterns and vulnerabilities"
    }
  ],
  "mcp": {
    "toolName": "solidity-pattern-scanner",
    "protocol": "mcp-compatible",
    "inputSchema": {
      "type": "object",
      "required": ["source"],
      "properties": {
        "source": { "type": "string" }
      }
    },
    "outputSchema": {
      "type": "object",
      "required": ["findings", "summary"],
      "properties": {
        "findings": { "type": "array" },
        "summary": { "type": "object" }
      }
    }
  },
  "invocation": {
    "transport": "axl",
    "axlPeerId": "axl-peer-solidity-01",
    "axlMethod": "invokeTool",
    "timeoutMs": 20000
  },
  "storage": {
    "manifestUri": "0g://manifests/otm_ens_solidity-scanner.auditagent.eth-0.1.0.json",
    "traceNamespace": "traces/solidity-scanner"
  },
  "compatibility": {
    "sdkVersionRange": "^0.1.0",
    "manifestApiVersion": "v1"
  },
  "integrity": {
    "manifestHash": "sha256:ddd20540138a8fb9711cb3d751f940964390d3a9fb54e147c0284e6205f64524",
    "createdAt": "2026-04-28T00:00:00.000Z"
  }
}
```

来源： [services/tool-node/manifests/solidity-pattern-scanner.manifest.json](/workspace/project/services/tool-node/manifests/solidity-pattern-scanner.manifest.json:1)

## 与其他模块的接口关系 / How Other Modules Consume It

### CLI

CLI 通过 manifest 暴露三类真实命令行为：

- `publish`：发布 manifest 并更新 capability index
- `verify`：解析 ENS 后加载并校验 manifest
- `call`：加载 manifest 后按 schema 校验输入并发起调用

### SDK

SDK 是 manifest 的主要消费方，它会：

- 解析 identity
- 发现候选工具
- 读取 manifest blob
- 校验 owner/hash/schema/version
- 用 `mcp.*` 和 `invocation.*` 组织远端调用

### Tool Node

tool node 不解析 manifest 文件本身，但它必须与 manifest 中声明的调用契约保持一致：

- `invocation.axlMethod` 当前应与 `invokeTool` handler 对齐
- `mcp.inputSchema` / `outputSchema` 必须和实际 request / response shape 一致

换句话说，tool node 是 manifest 的实现方，而不是 manifest 的发布方。

### Audit Agent

audit-agent 是 manifest 的参考消费方。它展示了一个调用方如何按顺序：

1. 发现 capability
2. 解析 ENS identity
3. 加载 manifest
4. 校验 manifest
5. 基于 manifest 参数发起调用并持久化 trace

### Dashboard

dashboard 不负责发布或校验 manifest，但它会通过 runtime trace 里的 `manifestUri` 反查运行时所用 manifest，并把 capability、工具名、调用方式等信息还原成页面叙事。

因此 dashboard 依赖的是“manifest 被正确发布且 trace 指针正确”，而不是直接参与 manifest 生命周期。

## 最小交互示例 / Minimal Interaction Example

下面的伪代码展示当前 manifest 相关交互的最小顺序：

```ts
const discovered = await client.discoverTools({
  capability: "solidity-static-analysis",
  limit: 1
});

const identity = await client.resolveIdentity({
  ensName: discovered[0].ensName
});

const manifest = await client.loadManifest({
  manifestUri: identity.latestManifestUri
});

const verification = await client.verifyManifest({
  identity,
  manifest,
  sdkVersion: "0.1.0"
});

if (!verification.ok) {
  throw new Error(verification.errors.join(", "));
}

const response = await client.invokeTool({
  capability: "solidity-static-analysis",
  tool: identity,
  manifest,
  agentId: "audit-agent-example",
  input: { source },
  traceId
});
```

这段顺序体现了当前 manifest 的真实地位：

- discovery 先找到候选
- identity 提供最新 manifest 指针
- manifest 决定校验与调用参数
- invocation 按 manifest 契约发出

## 当前边界内外 / In Scope vs Out Of Scope

当前已经实现并可写入文档的 manifest 事实：

- `ToolManifest`、`ToolIdentity`、`CapabilityIndexEntry` 类型定义
- manifest 发布到本地 0G-like blob storage
- ENS text records 回填 manifest 指针与 owner 信息
- capability index 按 capability 建索引
- hash / owner / schema / version 的最小校验
- manifest 驱动的 input/output schema 校验与 invocation 参数绑定

当前不应写成“已经实现”的内容：

- 生产级签名验真
- 多版本 manifest 迁移
- 复杂 semver 范围求交
- 链上真实 ENS / 0G / AXL 后端
- marketplace、payment、reputation

## 代码入口速查 / Code Entry Points

- [packages/shared/src/manifest.ts](/workspace/project/packages/shared/src/manifest.ts:1)
- [packages/sdk/src/client/create-client.ts](/workspace/project/packages/sdk/src/client/create-client.ts:49)
- [packages/sdk/src/client/local-devnet.ts](/workspace/project/packages/sdk/src/client/local-devnet.ts:1)
- [packages/sdk/src/types/contracts.ts](/workspace/project/packages/sdk/src/types/contracts.ts:1)
- [packages/cli/src/commands/helpers.ts](/workspace/project/packages/cli/src/commands/helpers.ts:1)
- [packages/cli/src/commands/publish.ts](/workspace/project/packages/cli/src/commands/publish.ts:1)
- [packages/cli/src/commands/verify.ts](/workspace/project/packages/cli/src/commands/verify.ts:1)
- [services/tool-node/manifests/solidity-pattern-scanner.manifest.json](/workspace/project/services/tool-node/manifests/solidity-pattern-scanner.manifest.json:1)
- [examples/audit-agent/src/run-audit.ts](/workspace/project/examples/audit-agent/src/run-audit.ts:131)
