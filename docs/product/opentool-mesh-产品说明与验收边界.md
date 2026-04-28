# OpenTool Mesh 产品说明与验收边界

## 1. 项目定位

OpenTool Mesh 是一个面向 AI agents 的去中心化工具注册、发现、调用与执行记忆层。

它解决的问题不是“如何再做一个 agent”，而是“如何让 agent 使用工具这件事，从本地硬编码配置，升级为可发现、可验证、可远程调用、可复盘的基础设施能力”。

一句话定义：

> OpenTool Mesh turns hardcoded agent tools into discoverable, verifiable, peer-to-peer tools with persistent execution memory.

中文表达：

> OpenTool Mesh 把写死在本地配置里的 agent 工具，变成可发现、可验证、可远程调用、可追踪复盘的工具网络。

## 2. 目标用户与使用场景

OpenTool Mesh 面向的是开发者基础设施场景，不是普通 C 端用户。

核心目标用户：

- agent framework builders
- MCP server / tool builders
- AI infra hackers
- agent developers
- web3 developer tooling builders

核心使用场景：

- agent 需要按 capability 动态发现第三方工具，而不是本地写死 endpoint
- agent 需要在调用前验证工具 manifest、schema、owner、version
- agent 需要通过远程节点调用工具，而不是把工具内置为本地函数
- agent 需要把每次调用过程沉淀为可审计、可回放、可归档的 execution trace

## 3. 核心叙事

今天大多数 agent 工具调用流程是：

- 开发者手动配置工具
- 工具 endpoint 写死在本地
- schema 和版本散落在配置文件里
- agent 无法动态发现第三方工具
- 远程工具调用缺少统一 trace
- 调用结果难以审计和复盘

OpenTool Mesh 的目标流程是：

1. 工具发布方发布一个 tool identity
2. agent 通过 ENS 解析工具身份
3. agent 从 0G 读取版本化 manifest
4. agent 验证 schema、owner、version、manifest hash
5. agent 通过 Gensyn AXL 调用远程 tool node
6. 调用输入、输出、manifest、状态、artifact 被写入 0G trace
7. dashboard 展示完整工具生命周期

赞助方分工可统一表述为：

- ENS：工具身份和发现入口
- 0G：manifest、artifact 和 execution memory
- Gensyn AXL：agent 与远程 tool node 的 P2P 调用
- MCP：工具接口兼容语义

## 4. 产品边界定义

### 4.1 OpenTool Mesh 是什么

OpenTool Mesh 是：

- agent tool discovery layer
- agent tool identity layer
- agent tool manifest layer
- agent remote invocation layer
- agent execution memory layer

### 4.2 OpenTool Mesh 不是什么

OpenTool Mesh 不是：

- 不是 agent marketplace
- 不是 payment layer
- 不是 MCP 替代品
- 不是完整 agent framework
- 不是安全审计产品本身
- 不是 tool reputation platform
- 不是多 agent 协作平台

### 4.3 和 MCP 的关系

推荐对外表述：

> MCP defines how tools are described and called. OpenTool Mesh defines how MCP-compatible tools are discovered, verified, invoked remotely, and remembered.

中文表达：

> MCP 定义工具接口。OpenTool Mesh 补上去中心化发现、身份、版本、远程调用和执行记忆。

不推荐表述：

- “我们在做 MCP Registry 替代品”
- “因为 MCP 没有 registry，所以我们补一个 registry”

推荐表述重点应始终落在：

- decentralized identity
- verifiable manifest
- P2P invocation
- execution trace

## 5. 黑客松版本最终目标

黑客松版本不做完整平台，而是交付一个清晰、可运行、可展示的最小闭环：

> publish → discover → verify → call → trace → report

对应 demo 路径：

1. 工具发布方发布一个 Solidity audit 工具
2. 工具 identity 绑定到 ENS
3. manifest 存到 0G
4. capability index 存到 0G
5. audit agent 根据 capability 发现工具
6. agent 验证 manifest
7. agent 通过 AXL 调用远程 tool node
8. tool node 返回审计结果
9. agent 把 execution trace 写回 0G
10. dashboard 展示整个过程

只要这个闭环跑通，项目就成立。

## 6. 推荐 Demo 场景

推荐最终 demo 为：`Solidity Audit Agent`

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

## 7. MVP 范围

### 7.1 必须包含

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

### 7.2 推荐包含

这些能力会显著提升竞争力：

1. 两个 remote tool nodes
2. manifest version history
3. owner signature verification
4. output schema validation
5. dashboard 展示 trace artifact
6. 最终 audit report 引用 trace id
7. manifest version mismatch / rejection demo
8. 一个轻量 0G Chain registry contract

### 7.3 明确不做

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

## 8. 最终验收边界

### 8.1 功能验收边界

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

dashboard 是核心展示物，至少需要四个区块：

1. Discovery
2. Manifest
3. Invocation
4. Memory

每个区块都应让评委一眼看懂：

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
- AXL peer
- tool call status
- input hash
- output hash
- trace URI
- final report

### 8.2 Demo 验收边界

最终 demo 必须能跑通这条路径：

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

### 8.3 非验收内容

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

这部分是范围控制的关键，需要在 README、demo 讲解和评委沟通中反复强调。

## 9. 技术路线与推荐产品形态

### 9.1 总体技术路线

推荐使用 TypeScript-first stack。

原因：

- SDK、CLI、dashboard、agent example、tool node adapter 共用语言生态
- 降低集成成本
- 便于黑客松周期内快速闭环

### 9.2 技术选型表

| 层级 | 推荐选择 | 用途 | 选择理由 |
| --- | --- | --- | --- |
| SDK | TypeScript | OpenTool Mesh SDK | 易于和 agent framework / MCP / web dashboard 对接 |
| CLI | Node.js + TypeScript | publish / resolve / discover / call / trace | 开发速度快，便于 demo |
| Dashboard | React / Next.js | 展示工具生命周期 | 展示效果好，适合黑客松 |
| Agent Example | TypeScript agent | Solidity audit agent | 与 SDK 共享代码 |
| Tool Node | Node.js service | 远程工具执行节点 | 与 AXL / SDK 集成成本低 |
| Tool Interface | MCP-compatible manifest | 工具能力和 schema 描述 | 不重造工具接口语义 |
| Identity | ENS | 工具身份、metadata 入口 | 适合作为 tool identity root |
| Storage / Memory | 0G Storage + 0G KV | manifest、artifact、trace、index | 同时覆盖不可变记录和动态索引 |
| Optional Registry | 0G Chain contract | latest manifest pointer / publication event | 增强 0G 集成可信度 |
| Transport | Gensyn AXL | agent 到 tool node 的 P2P 调用 | 符合 inter-node communication 场景 |
| Validation | JSON Schema + signature verification | manifest / input / output 验证 | 能体现 trust boundary |
| Demo Tool | Solidity pattern scanner | 审计场景主工具 | 稳定、容易理解、依赖少 |
| Secondary Tool | Test suggester / mock test runner | 第二个工具节点 | 展示多工具发现与调用能力 |

### 9.3 推荐产品形态

最终交付建议拆成：

1. `@opentoolmesh/sdk`
2. `opentool` CLI
3. tool node adapter
4. audit agent example
5. dashboard
6. demo manifests
7. README + architecture diagram

不建议把项目包装成一个单一网页 app。

更好的定位是：

> 一个 developer infrastructure project，dashboard 只是可视化窗口。

## 10. 推荐 MVP 结构

### 10.1 SDK

SDK 只需要覆盖最核心生命周期：

- `resolve`
- `discover`
- `verify`
- `call`
- `recordTrace`
- `saveArtifact`

SDK 不需要承担复杂 agent planning。

SDK 的产品意义是让评委相信：

- 这不是一次性 demo
- 这是其他 agent builder 可以复用的 tool layer

### 10.2 CLI

CLI 推荐最小支持：

- `publish`
- `resolve`
- `discover`
- `call`
- `trace`

CLI 的产品意义：

- 增强 developer tooling 感
- 证明项目不是只为网页演示写的一次性脚本

### 10.3 Dashboard

Dashboard 只服务一个目标：

> 把抽象 infra 变成评委能一眼看懂的完整链路。

它不需要：

- 登录系统
- 复杂交互
- 生产级 UI

它应该展示：

- agent 想要什么 capability
- 发现了哪个 ENS tool identity
- manifest 存在哪里
- manifest 是否验证通过
- AXL 调用了哪个 peer
- 工具返回了什么结果
- trace 写到了哪里
- 最终报告引用了哪些 trace

### 10.4 Tool Nodes

黑客松版本推荐两个 tool node：

- Tool Node 1：Solidity Pattern Scanner
- Tool Node 2：Test Case Suggester

要求：

- 第一个必须跑通
- 第二个作为竞争力增强项

建议：

- 一开始不要重度依赖完整 Slither / Foundry 集成
- 可把真实工具接入作为 stretch goal

## 11. 交付优先级

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

## 12. 对开发与演示的产品要求

### 12.1 对工程实现的约束

- 不允许把 tool endpoint 直接硬编码在 agent 逻辑里作为唯一调用路径
- 允许存在最小 capability index，但必须能证明“发现”先于“调用”
- manifest 校验需要对外可见，不能只在内部静默执行
- trace 必须具备可引用 ID 或 URI，保证报告与 dashboard 可回链

### 12.2 对 dashboard 的要求

dashboard 是最重要的展示物，不只是辅助页面。

它需要承担三件事：

1. 解释 OpenTool Mesh 为什么成立
2. 证明调用链条不是硬编码
3. 证明 trace 不是日志，而是可验证 provenance

### 12.3 对 demo 讲解的建议顺序

推荐讲解顺序：

1. 先讲问题：今天 agent 工具是 hardcoded 的
2. 再讲机制：ENS + 0G + AXL + MCP-compatible manifest
3. 然后跑 demo：discover → verify → call → trace → report
4. 最后讲意义：可移植、可验证、可复盘的 agent tool infra

## 13. README 可复用主描述

以下内容可直接沉淀到项目 README：

### 13.1 English

```md
# OpenTool Mesh

OpenTool Mesh is a decentralized tool discovery, invocation, and execution memory layer for AI agents.

Today, most agents use hardcoded tools: the endpoint, schema, version, and permissions are configured locally by the developer. This makes tools difficult to discover, verify, reuse, and audit across different agent runtimes.

OpenTool Mesh turns tools into discoverable network resources. Each tool has an ENS-based identity, a versioned manifest stored on 0G, a remote invocation endpoint over Gensyn AXL, and a persistent execution trace for every call.

In the demo, a Solidity audit agent receives a smart contract, discovers a remote static analysis tool by capability, resolves its ENS identity, verifies its 0G manifest, invokes the tool node over AXL, and stores the full execution trace on 0G. The dashboard shows the complete lifecycle from discovery to final audit report.

OpenTool Mesh is not a marketplace, payment layer, or agent swarm. It is infrastructure for agent builders who want portable, verifiable, and memory-backed tool usage.
```

### 13.2 中文

```md
# OpenTool Mesh

OpenTool Mesh 是一个面向 AI agents 的去中心化工具发现、调用与执行记忆层。

现在大多数 agent 调用工具时，都需要开发者在本地配置里写死工具 endpoint、schema、版本和权限。这导致工具难以被发现、验证、复用，也难以跨 agent runtime 审计和复盘。

OpenTool Mesh 把工具变成可发现的网络资源。每个工具拥有 ENS-based identity，版本化 manifest 存储在 0G 上，远程调用通过 Gensyn AXL 完成，每次调用都会生成持久化 execution trace。

在 demo 中，一个 Solidity audit agent 接收智能合约后，会根据 capability 发现远程静态分析工具，解析 ENS identity，验证 0G manifest，通过 AXL 调用 tool node，并将完整执行 trace 写入 0G。dashboard 会展示从工具发现到最终审计报告的完整生命周期。

OpenTool Mesh 不是 marketplace，不是 payment layer，也不是 agent swarm。它是给 agent builders 使用的可移植、可验证、带执行记忆的工具基础设施。
```

## 14. 最终结论

OpenTool Mesh 的产品成立条件，不是“做了多少页面”或“接了多少工具”，而是是否跑通下面这个最小闭环：

> publish → discover → verify → call → trace → report

只要项目可以稳定展示：

- 工具身份不是本地硬编码
- manifest 是可验证的
- 调用是远程的
- trace 是持久化且可引用的
- dashboard 能把整条链路讲清楚

那么这个黑客松项目就具备清晰定位、可验证价值和可讲述性，足以成立。
