# OpenTool Mesh 产品说明与验收边界

## 1. 项目定位

OpenTool Mesh 是一个面向 AI agents 的去中心化工具发现、调用与执行记忆层。

它解决的问题不是“再做一个 agent”，而是“让 agent 使用工具这件事，从本地硬编码配置升级为可发现、可验证、可远程调用、可复盘的基础设施能力”。

一句话定义：

> OpenTool Mesh turns hardcoded agent tools into discoverable, verifiable, peer-to-peer tools with persistent execution memory.

中文表达：

> OpenTool Mesh 把写死在本地配置里的 agent 工具，变成可发现、可验证、可远程调用、可追踪复盘的工具网络。

对外叙事必须固定强调：

- 它不是 marketplace
- 它不是 payment layer
- 它不是 agent swarm
- 它是 agent tool discovery + invocation + memory layer

## 2. 目标用户与使用场景

OpenTool Mesh 面向开发者基础设施场景，不面向普通 C 端用户。

核心目标用户：

- agent framework builders
- MCP server / tool builders
- AI infra hackers
- agent developers
- web3 developer tooling builders

核心使用场景：

- agent 需要按 capability 动态发现第三方工具，而不是在本地写死 endpoint
- agent 需要在调用前验证 manifest、schema、owner、version、hash
- agent 需要通过远程节点调用工具，而不是把工具实现内嵌成 agent 内部函数
- agent 需要把每次工具调用沉淀为可审计、可回放、可归档的 execution trace

## 3. 核心叙事

今天大多数 agent 的工具调用流程是：

- 开发者手动配置工具
- 工具 endpoint 写死在本地
- schema 和版本散落在配置文件里
- agent 无法动态发现第三方工具
- 远程工具调用缺少统一 trace
- 调用结果难以审计和复盘

OpenTool Mesh 要把它改造成下面这条闭环：

> publish → discover → verify → call → trace → report

对应流程：

1. 工具发布方发布一个 tool identity
2. agent 通过 ENS 解析工具身份
3. agent 从 0G 读取版本化 manifest
4. agent 验证 schema、owner、version、manifest hash
5. agent 通过 Gensyn AXL 调用远程 tool node
6. 调用输入、输出、manifest、状态、artifact 被写入 0G trace
7. dashboard 与最终 report 展示完整生命周期

赞助方能力边界固定表述为：

- ENS：工具身份和解析入口
- 0G Storage：manifest、trace、artifact、final report 的不可变存储
- 0G KV：capability index、latest manifest pointer、trace summary
- Gensyn AXL：agent 与远程 tool node 的 P2P 调用通道
- MCP-compatible manifest：工具能力、输入输出 schema 与调用契约描述

## 4. 四层职责边界

为避免产品文档与技术架构漂移，职责边界固定为四层：

### 4.1 Identity & Discovery

- ENS 负责 tool identity 命名与解析入口
- 0G KV 负责 capability 到 tool identity 的最小索引
- agent 必须先 discover，再 resolve，不能直接跳到硬编码调用

### 4.2 Manifest & Verification

- 0G Storage 保存版本化 manifest
- manifest 描述 capability、owner、schema、invocation、compatibility、integrity
- agent 调用前必须验证 manifest hash、owner、schema、version compatibility

### 4.3 Invocation

- Gensyn AXL 负责 agent runtime 与 remote tool node 的跨节点调用
- tool node 必须是独立进程或独立节点，不可退化为 agent 内部函数
- tool node 返回结构化结果，由 agent 端统一消费

### 4.4 Memory & Report

- 0G Storage 保存 request、response、artifact、trace、final report
- 0G KV 保存 trace summary 供 dashboard 检索
- dashboard 读取 discovery / manifest / invocation / memory 证据，最终 report 引用 trace id 或 trace uri

## 5. 产品边界定义

### 5.1 OpenTool Mesh 是什么

OpenTool Mesh 是：

- agent tool discovery layer
- agent tool identity layer
- agent tool manifest layer
- agent remote invocation layer
- agent execution memory layer

### 5.2 OpenTool Mesh 不是什么

OpenTool Mesh 不是：

- 不是 agent marketplace
- 不是 payment layer
- 不是 MCP 替代品
- 不是完整 agent framework
- 不是安全审计产品本身
- 不是 tool reputation platform
- 不是多 agent 协作平台

### 5.3 和 MCP 的关系

推荐对外表述：

> MCP defines how tools are described and called. OpenTool Mesh defines how MCP-compatible tools are discovered, verified, invoked remotely, and remembered.

中文表达：

> MCP 定义工具接口。OpenTool Mesh 补上去中心化发现、身份、版本、远程调用和执行记忆。

不推荐表述：

- “我们在做 MCP Registry 替代品”
- “因为 MCP 没有 registry，所以我们补一个 registry”

## 6. 黑客松版本最终目标

黑客松版本不做完整平台，而是交付一个清晰、可运行、可展示的最小闭环：

> publish → discover → verify → call → trace → report

对应 demo 路径：

1. 工具发布方发布一个 Solidity audit 工具
2. 工具 identity 绑定到 ENS
3. manifest 存到 0G
4. capability index 存到 0G
5. audit agent 根据 capability 发现工具
6. agent 解析 ENS identity 并读取 manifest
7. agent 验证 manifest
8. agent 通过 AXL 调用 remote tool node
9. tool node 返回结构化审计结果
10. agent 把 trace、artifact、report 写回 0G
11. dashboard 展示 Discovery、Manifest、Invocation、Memory 四段链路

只要这个闭环跑通，项目就成立。

## 7. 推荐 Demo 场景

推荐最终 demo 为 `Solidity Audit Agent`。

用户提交一个 Solidity 合约后，agent 本身不预置具体工具地址，只知道自己需要的能力：

- `solidity-static-analysis`
- `solidity-test-analysis`

然后通过 OpenTool Mesh 自动完成：

- 发现工具
- 验证工具
- 调用工具
- 保存 trace
- 生成审计报告

最低展示要求：

- 至少 1 个真实 remote tool node：`solidity-pattern-scanner`

推荐增强展示：

- 第 2 个 remote tool node：`test-case-suggester`

角色分工建议：

- `solidity-pattern-scanner`：输出漏洞发现、模式命中、风险解释
- `test-case-suggester`：输出测试建议、攻击路径建议、验证方向

## 8. MVP 范围

### 8.1 必须包含

黑客松 MVP 必须包含：

1. 一个 OpenTool Mesh SDK
2. 一个 OpenTool CLI
3. 一个 dashboard
4. 一个 audit agent example
5. 至少一个 remote tool node
6. ENS-based tool identity
7. 0G-based manifest storage
8. 0G-based execution trace storage
9. AXL-based remote invocation
10. manifest verification flow

### 8.2 推荐包含

这些能力会显著提升竞争力：

1. 两个 remote tool nodes
2. manifest version history
3. owner signature verification
4. output schema validation
5. dashboard 展示 trace artifact
6. 最终 audit report 引用 trace id
7. manifest version mismatch / rejection demo
8. 一个轻量 0G Chain registry contract

### 8.3 明确不做

黑客松版本不要做：

1. payment
2. marketplace
3. tool reputation ranking
4. 复杂权限系统
5. 多 agent swarm
6. 全量 MCP Registry 替代品
7. 完整生产级安全沙箱
8. 复杂加密数据权限
9. 面向 C 端的工具商店
10. 所有类型工具的通用生态

## 9. SDK、CLI 与 Dashboard 的最小产品要求

### 9.1 SDK

SDK 只需要覆盖最核心生命周期：

- `resolveIdentity`
- `discoverTools`
- `loadManifest`
- `verifyManifest`
- `invokeTool`
- `recordTrace`
- `saveArtifact`
- `publishManifest`
- `buildAuditReport`

其中 `saveArtifact` 必须明确保留在 SDK 必含能力中，因为 trace 与最终 report 的可追溯性依赖 artifact 独立持久化。

### 9.2 CLI

CLI 推荐最小支持：

- `publish`
- `resolve`
- `discover`
- `verify`
- `call`
- `trace`

### 9.3 Dashboard

Dashboard 是核心展示物，只服务一个目标：

> 把抽象 infra 变成评委能一眼看懂的完整链路。

至少需要四个区块：

1. Discovery
2. Manifest
3. Invocation
4. Memory

## 10. 最终验收边界

### 10.1 功能验收边界

#### 验收 1：工具可以被发布

项目需要证明：

- 一个工具可以被发布为 OpenTool Mesh tool
- 工具有 identity
- 工具有 manifest
- 工具有 capability
- 工具有 owner 信息
- 工具有调用方式描述
- manifest 被持久化到 0G

不要求：

- 大量工具发布
- 生产级发布流

#### 验收 2：agent 可以发现工具

项目需要证明：

- agent 不是从本地 hardcoded endpoint 调用工具
- agent 可以根据 capability 找到候选工具
- agent 可以解析工具 identity
- agent 可以读取对应 manifest

最低合格标准：

- agent 根据 `solidity-static-analysis` 找到 Solidity scanner tool

允许：

- 存在最小 capability index

不允许：

- 只是在 agent 代码里把 tool endpoint 写死

#### 验收 3：manifest 可以被验证

项目需要证明：

- agent 在调用工具前会检查 manifest
- agent 知道工具 version
- agent 知道工具 owner
- agent 知道 input / output schema
- agent 可以判断 manifest 是否可信或兼容

最低合格标准：

- dashboard 显示 manifest hash、owner、version、schema status

更强标准：

- agent 可以拒绝一个不兼容 manifest

#### 验收 4：agent 可以远程调用 tool node

项目需要证明：

- agent runtime 和 tool node 是分离的
- tool node 不是 agent 内部函数
- 调用通过 AXL 完成
- tool node 返回结构化结果

最低合格标准：

- 一个 agent client node
- 一个 remote Solidity scanner node
- 两者通过 AXL 完成一次工具调用

推荐展示方式：

- 两个 terminal
- 两个独立 node
- 一次完整 request / response

#### 验收 5：执行 trace 被写入 0G

项目需要证明：

- 每次工具调用后都会生成 trace
- trace 包含 tool identity
- trace 包含 manifest reference
- trace 包含 input hash
- trace 包含 output hash
- trace 包含 status
- trace 包含 artifact / report reference
- trace 被持久化到 0G

最低合格标准：

- dashboard 可以打开某次 tool call 的 trace

不要求完全可复现执行环境，但需要做到：

> verifiable provenance

也就是可以证明：

- 哪个 agent
- 用了哪个工具
- 基于哪个 manifest
- 输入是什么 hash
- 输出是什么 hash
- 结果是什么
- trace 存在哪里

#### 验收 6：dashboard 能讲清楚完整链路

dashboard 至少需要让评委一眼看懂：

- ENS 用在哪里
- 0G 用在哪里
- AXL 用在哪里
- agent 为什么不是 hardcoded tool 调用

最低合格标准：

- dashboard 展示一次完整 audit run

至少包含字段：

- requested capability
- resolved tool identity
- manifest URI
- manifest hash
- owner
- version
- schema status
- AXL peer
- tool call status
- input hash
- output hash
- trace URI
- final report

### 10.2 Demo 验收边界

最终 demo 必须跑通这条路径：

用户提交 Solidity 合约
↓
agent 判断需要 `solidity-static-analysis`
↓
agent 发现 Solidity scanner tool
↓
agent 解析 ENS identity
↓
agent 读取 0G manifest
↓
agent 验证 manifest
↓
agent 通过 AXL 调用 remote tool node
↓
tool node 返回 findings
↓
agent 写入 0G trace
↓
dashboard 展示 trace 和审计报告

只要这条路径跑通，项目就达到黑客松验收边界。

### 10.3 非验收内容

以下不作为最终验收要求：

1. 不要求支持真实大规模工具网络
2. 不要求支持任意 MCP server
3. 不要求替代 MCP Registry
4. 不要求做到生产级权限控制
5. 不要求支持 tool monetization
6. 不要求支持复杂 agent planning
7. 不要求支持所有链或所有存储后端
8. 不要求审计工具达到专业安全审计准确率
9. 不要求 tool node 具有生产级 SLA
10. 不要求完全可复现执行环境

## 11. P0 / P1 / P2 优先级

### P0：项目成立的最低闭环

1. 一个工具 manifest 被发布到 0G
2. 一个 ENS identity 可以解析到该工具
3. agent 可以根据 capability 发现该工具
4. agent 可以读取并验证 manifest
5. agent 可以通过 AXL 调用远程 tool node
6. tool node 返回结构化 audit result
7. agent 将 trace 写入 0G
8. dashboard 展示完整过程

只要 P0 完成，项目就成立。

### P1：明显增强竞争力的能力

1. 两个 remote tool nodes
2. owner signature verification
3. manifest hash verification
4. output schema validation
5. final report 引用 trace id
6. manifest version mismatch rejection
7. 0G Chain registry event / pointer

P1 完成后，项目会更像 infra，而不是 demo app。

### P2：可选增强

1. MCP Registry import
2. MCP server export
3. encrypted artifacts
4. tool policy engine
5. tool reputation
6. multi-agent handoff
7. real Slither integration
8. real Foundry runner

P2 不应影响 P0 交付节奏。

## 12. 与技术架构对齐的最小数据示例

### 12.1 Manifest 最小示例

下面这个最小示例足以支持产品验收中对 capability、owner、schema、invocation、integrity 的要求：

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
    "manifestUri": "0g://manifests/solidity-scanner/0.1.0.json",
    "traceNamespace": "traces/solidity-scanner"
  },
  "compatibility": {
    "sdkVersionRange": "^0.1.0",
    "manifestApiVersion": "v1"
  },
  "integrity": {
    "manifestHash": "sha256:manifest123",
    "createdAt": "2026-04-28T00:00:00.000Z"
  }
}
```

### 12.2 Trace 最小示例

下面这个最小示例足以支持 dashboard 对 requested capability、tool identity、manifest、AXL peer、input/output hash、trace uri 的展示：

```json
{
  "traceId": "trace_01",
  "runId": "audit_run_01",
  "agentId": "audit-agent-example",
  "requestedCapability": "solidity-static-analysis",
  "tool": {
    "toolId": "otm:ens:solidity-scanner.auditagent.eth",
    "ensName": "solidity-scanner.auditagent.eth",
    "manifestUri": "0g://manifests/solidity-scanner/0.1.0.json",
    "manifestHash": "sha256:manifest123",
    "version": "0.1.0",
    "ownerAddress": "0x1234567890abcdef1234567890abcdef12345678"
  },
  "discovery": {
    "candidateCount": 1,
    "selectedReason": "best capability match",
    "resolvedAt": "2026-04-28T00:00:10.000Z"
  },
  "verification": {
    "manifestHashValid": true,
    "ownerValid": true,
    "schemaValid": true,
    "versionCompatible": true,
    "verifiedAt": "2026-04-28T00:00:12.000Z"
  },
  "invocation": {
    "transport": "axl",
    "peerId": "axl-peer-solidity-01",
    "method": "invokeTool",
    "status": "ok",
    "startedAt": "2026-04-28T00:00:14.000Z",
    "finishedAt": "2026-04-28T00:00:18.000Z"
  },
  "io": {
    "inputHash": "sha256:input123",
    "outputHash": "sha256:output123"
  },
  "artifacts": [
    {
      "kind": "tool-output",
      "uri": "0g://artifacts/trace_01/findings.json",
      "hash": "sha256:artifact123",
      "mediaType": "application/json"
    }
  ],
  "storage": {
    "traceUri": "0g://traces/trace_01.json",
    "persistedAt": "2026-04-28T00:00:19.000Z",
    "backend": "0g-storage"
  }
}
```

## 13. 对开发与演示的产品要求

### 13.1 对工程实现的约束

- 不允许把 tool endpoint 直接硬编码在 agent 逻辑里作为唯一调用路径
- 允许存在最小 capability index，但必须能证明“发现”先于“调用”
- manifest 校验需要对外可见，不能只在内部静默执行
- trace 必须具备可引用 ID 或 URI，保证 report 与 dashboard 可回链
- tool node 与 agent 必须保持独立运行边界，不能用本地函数伪装远程调用

### 13.2 对 dashboard 的要求

dashboard 需要承担三件事：

1. 解释 OpenTool Mesh 为什么成立
2. 证明调用链条不是硬编码
3. 证明 trace 不是日志，而是可验证 provenance

### 13.3 对 demo 讲解的建议顺序

推荐讲解顺序：

1. 先讲问题：今天 agent 工具是 hardcoded 的
2. 再讲机制：ENS + 0G + AXL + MCP-compatible manifest
3. 然后跑 demo：publish → discover → verify → call → trace → report
4. 最后讲意义：可移植、可验证、可复盘的 agent tool infra

## 14. README 可直接复用描述

### 14.1 English

```md
# OpenTool Mesh

OpenTool Mesh is a decentralized tool discovery, invocation, and execution memory layer for AI agents.

Today, most agents use hardcoded tools: the endpoint, schema, version, and permissions are configured locally by the developer. This makes tools difficult to discover, verify, reuse, and audit across different agent runtimes.

OpenTool Mesh turns tools into discoverable network resources. Each tool has an ENS-based identity, a versioned manifest stored on 0G, a remote invocation endpoint over Gensyn AXL, and a persistent execution trace for every call.

In the demo, a Solidity audit agent receives a smart contract, discovers a remote static analysis tool by capability, resolves its ENS identity, verifies its 0G manifest, invokes the tool node over AXL, and stores the full execution trace on 0G. The dashboard shows the complete lifecycle from discovery to final audit report.

OpenTool Mesh is not a marketplace, payment layer, or agent swarm. It is infrastructure for agent builders who want portable, verifiable, and memory-backed tool usage.
```

### 14.2 中文

```md
# OpenTool Mesh

OpenTool Mesh 是一个面向 AI agents 的去中心化工具发现、调用与执行记忆层。

现在大多数 agent 调用工具时，都需要开发者在本地配置里写死工具 endpoint、schema、版本和权限。这导致工具难以被发现、验证、复用，也难以跨 agent runtime 审计和复盘。

OpenTool Mesh 把工具变成可发现的网络资源。每个工具拥有 ENS-based identity，版本化 manifest 存储在 0G 上，远程调用通过 Gensyn AXL 完成，每次调用都会生成持久化 execution trace。

在 demo 中，一个 Solidity audit agent 接收智能合约后，会根据 capability 发现远程静态分析工具，解析 ENS identity，验证 0G manifest，通过 AXL 调用 tool node，并将完整执行 trace 写入 0G。dashboard 会展示从工具发现到最终审计报告的完整生命周期。

OpenTool Mesh 不是 marketplace，不是 payment layer，也不是 agent swarm。它是给 agent builders 使用的可移植、可验证、带执行记忆的工具基础设施。
```

## 15. 最终结论

OpenTool Mesh 的产品成立条件，不是“做了多少页面”或“接了多少工具”，而是是否跑通下面这个最小闭环：

> publish → discover → verify → call → trace → report

只要项目可以稳定展示：

- 工具身份不是本地硬编码
- manifest 是可验证的
- 调用是远程的
- trace 是持久化且可引用的
- dashboard 能把整条链路讲清楚

那么这个黑客松项目就具备清晰定位、可验证价值和可讲述性，足以成立。
