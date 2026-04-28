# OpenTool Mesh 黑客松 MVP 技术架构与模块拆分

## 1. 文档目标

本文定义 OpenTool Mesh 黑客松 MVP 的技术架构、模块拆分、职责边界、核心数据结构、目录布局和接口契约。目标是让后续开发可以围绕唯一闭环实现：

`publish -> discover -> verify -> call -> trace -> report`

本文默认项目范围严格服务于 Solidity Audit Agent demo，不扩展到 marketplace、payment、multi-agent swarm 或通用生产级权限系统。

## 2. MVP 技术结论

### 2.1 推荐技术栈

| 层 | 选择 | 版本建议 | 理由 |
| --- | --- | --- | --- |
| Monorepo | pnpm workspace + Turborepo | pnpm 10.x / turbo 2.x | 适合 SDK、CLI、dashboard、tool node、agent example 共仓管理 |
| 语言 | TypeScript | 5.6+ | SDK、CLI、dashboard、agent、node 复用类型与 schema |
| Runtime | Node.js | 22 LTS | 原生 fetch、稳定、适合 TS-first infra demo |
| Dashboard | Next.js App Router | 15.x | 快速做 demo UI、API route、静态部署方便 |
| UI | React + Tailwind CSS | React 19 / Tailwind 4.x | 足够表达 demo 链路，不引入额外复杂度 |
| Schema | JSON Schema + Zod | zod 3.x / ajv 8.x | 开发期类型推导 + 运行期输入输出验证 |
| Storage Adapter | 0G Storage + 0G KV | latest SDK pinned in lockfile | 覆盖 manifest/artifact 不可变存储与 capability/trace 索引 |
| Identity | ENS | viem 2.x / ethers alternative not needed | 读取 text records / contenthash 作为 tool identity root |
| Invocation | Gensyn AXL | pinned SDK commit/version | 满足 agent 与 remote tool node 分离和 P2P 调用 |
| Packaging | tsup | 8.x | SDK/CLI/node 包构建简单 |
| Testing | vitest | 2.x | 单元与契约测试快；适合 schema/adapter |
| E2E | playwright + demo scripts | latest stable | 验证 dashboard 展示完整闭环 |

### 2.2 架构原则

1. ENS 只做 identity root 与 discovery entry，不承载完整 manifest。
2. 0G Storage 存不可变内容：manifest、trace artifact、最终 report、tool output artifact。
3. 0G KV 存可查询索引：capability index、trace summary、latest manifest pointer。
4. AXL 只做远程 invocation transport，不承担 manifest 信任或历史记忆。
5. MCP-compatible manifest 负责工具接口语义，OpenTool Mesh 负责 discovery、verification、remote invocation、memory。
6. SDK 必须是第一公民；CLI、agent example、dashboard 都消费同一套 SDK 接口。

## 3. 系统上下文与职责边界

### 3.1 核心角色

| 角色 | 职责 |
| --- | --- |
| Tool Publisher | 生成 manifest，上传到 0G，写入 capability index，绑定 ENS identity |
| Audit Agent | 根据 capability 发现工具，验证 manifest，通过 AXL 调用工具，写入 trace，生成 audit report |
| Remote Tool Node | 对外暴露一个或多个 capability 的执行能力，返回结构化结果 |
| Dashboard | 可视化展示 discovery、manifest、invocation、memory 四段链路 |
| OpenTool Mesh SDK | 为 CLI / agent / dashboard 提供统一 domain API |

### 3.2 ENS / 0G / AXL / MCP 边界

| 组件 | 在 MVP 中负责什么 | 不负责什么 |
| --- | --- | --- |
| ENS | tool identity 命名；identity -> manifest pointer 入口；owner root | 不保存完整 manifest；不做 capability search；不做调用 |
| 0G Storage | 保存 manifest JSON、trace JSON、tool artifacts、final report | 不做链上 identity；不做 P2P transport |
| 0G KV | capability -> tool identities 索引；tool latest manifest pointer cache；trace summaries | 不保证链上级最终信任；不替代 blob storage |
| Gensyn AXL | agent <-> remote tool node request/response 通道 | 不负责 discovery、schema versioning、trace persistence |
| MCP-compatible manifest | 描述 capability、input/output schema、invocation contract | 不做分布式发现；不做 execution memory |

### 3.3 一句话边界定义

- MCP 定义工具长什么样、怎么调用。
- ENS 定义工具是谁、从哪里开始解析。
- 0G 定义工具清单与执行证据存在哪里。
- AXL 定义 agent 如何跨节点调用工具。
- OpenTool Mesh SDK 把这些流程组装成一条可复用的生命周期。

## 4. MVP 高层架构

```text
+-------------------+        +------------------+
| Audit Agent App   |        | OpenTool CLI     |
| example           |        | publish/resolve  |
+---------+---------+        +---------+--------+
          |                            |
          +------------+---------------+
                       |
               +-------v------------------------------+
               | @opentoolmesh/sdk                    |
               | - identity                           |
               | - discovery                          |
               | - verification                       |
               | - invocation                         |
               | - trace                              |
               | - storage adapters                   |
               +---+--------------+---------------+---+
                   |              |               |
         +---------v--+   +-------v-------+   +---v----------------+
         | ENS Resolver|   | 0G Adapters   |   | AXL Invocation     |
         | text records|   | storage + kv  |   | client/server      |
         +------------+   +---------------+   +--------------------+
                   \              |                      /
                    \             |                     /
                     \            |                    /
                  +---v-------------------------------v---+
                  | Remote Tool Node(s)                  |
                  | solidity-pattern-scanner             |
                  | test-case-suggester (optional/P1)    |
                  +--------------------------------------+

                               |
                               v
                   +------------------------------+
                   | Next.js Dashboard            |
                   | Discovery / Manifest /       |
                   | Invocation / Memory / Report |
                   +------------------------------+
```

## 5. 核心流程数据流

### 5.1 Publish Flow

1. Publisher 编写 tool manifest。
2. CLI 调用 SDK `publishManifest()` 将 manifest 上传到 0G Storage，获得 `manifestUri` 与 `manifestHash`。
3. CLI 调用 SDK `upsertCapabilityIndex()` 将 capability 映射写入 0G KV。
4. CLI 更新 ENS identity 的 text records：
   - `opentoolmesh.manifest_uri`
   - `opentoolmesh.manifest_hash`
   - `opentoolmesh.owner`
   - `opentoolmesh.latest_version`
5. 可选：写 0G Chain registry event / pointer 作为 P1 增强。

### 5.2 Discovery Flow

1. Agent 输入目标 capability，例如 `solidity-static-analysis`。
2. SDK 从 0G KV 查询 capability index，获得候选 tool identities。
3. SDK 对每个 identity 通过 ENS 解析 manifest pointer。
4. SDK 下载 manifest，构造候选列表与兼容性结果。
5. Agent 选择最合适的工具版本。

### 5.3 Verify Flow

1. 校验 ENS 返回的 `manifest_hash` 与下载内容 hash 一致。
2. 校验 manifest `owner` 与 ENS owner / text record 对齐。
3. 校验 manifest `sdkVersionRange` 与当前 SDK 兼容。
4. 校验 capability、input/output schema、invocation transport 是否满足调用需求。
5. 失败则拒绝调用，并在 dashboard 显示 rejection reason。

### 5.4 Call Flow

1. Agent 构造 `ToolInvocationRequest`。
2. SDK 对输入按 manifest `inputSchema` 做 JSON Schema 校验。
3. SDK 基于 manifest 的 `invocation.axl` 字段，通过 AXL client 发起调用。
4. Remote tool node 执行分析并返回结构化 `ToolInvocationResponse`。
5. SDK 对输出按 `outputSchema` 进行校验。

### 5.5 Trace Flow

1. SDK 对 input/output 生成 canonical JSON hash。
2. SDK 上传原始 request、response、artifact、report 到 0G Storage。
3. SDK 生成 `ExecutionTrace` 文档并写入 0G Storage。
4. SDK 将 trace summary 写入 0G KV 供 dashboard 检索。
5. 最终 report 引用 trace id / trace uri / tool identity / manifest version。

## 6. 核心数据模型

### 6.1 Tool Identity Model

```ts
export interface ToolIdentity {
  id: string; // otm:ens:solidity-scanner.auditagent.eth
  ensName: string; // solidity-scanner.auditagent.eth
  ownerAddress: `0x${string}`;
  latestManifestUri: string;
  latestManifestHash: string;
  latestVersion: string;
  capabilities: string[];
}
```

### 6.2 Manifest 结构

MVP manifest 必须足够明确地描述 capability、schema、调用方式、所有权和版本。

```ts
export interface ToolManifest {
  schemaVersion: 'otm.manifest.v1';
  toolId: string; // 与 identity 一致
  name: string;
  version: string; // semver
  description: string;
  owner: {
    ensName?: string;
    address: `0x${string}`;
    signature?: string; // P1
    publicKey?: string; // optional if non-EVM signing is used later
  };
  capabilities: Array<{
    id: string; // solidity-static-analysis
    description: string;
    tags?: string[];
  }>;
  mcp: {
    toolName: string;
    protocol: 'mcp-compatible';
    inputSchema: Record<string, unknown>;
    outputSchema: Record<string, unknown>;
  };
  invocation: {
    transport: 'axl';
    axlPeerId: string;
    axlMethod: string; // invokeTool
    timeoutMs: number;
    regionHint?: string;
  };
  storage: {
    manifestUri: string;
    artifactBaseUri?: string;
    traceNamespace: string;
  };
  compatibility: {
    sdkVersionRange: string; // ^0.1.0
    manifestApiVersion: 'v1';
  };
  integrity: {
    manifestHash: string; // sha256 of canonical json
    createdAt: string; // ISO 8601
  };
}
```

### 6.3 Capability Index 结构

推荐按 capability 存独立 key，value 为候选工具列表。

```ts
export interface CapabilityIndexEntry {
  capability: string;
  tools: Array<{
    toolId: string;
    ensName: string;
    manifestUri: string;
    manifestHash: string;
    version: string;
    ownerAddress: `0x${string}`;
    updatedAt: string;
    priority?: number;
  }>;
}
```

### 6.4 Invocation Request / Response

```ts
export interface ToolInvocationRequest<TInput = unknown> {
  requestId: string;
  traceId: string;
  toolId: string;
  capability: string;
  manifestUri: string;
  manifestHash: string;
  caller: {
    agentId: string;
    sessionId?: string;
  };
  input: TInput;
  inputHash: string;
  sentAt: string;
}

export interface ToolInvocationResponse<TOutput = unknown> {
  requestId: string;
  traceId: string;
  toolId: string;
  status: 'ok' | 'error';
  output?: TOutput;
  outputHash?: string;
  error?: {
    code: string;
    message: string;
    retriable?: boolean;
  };
  artifacts?: Array<{
    name: string;
    mediaType: string;
    uri?: string;
    hash?: string;
  }>;
  finishedAt: string;
}
```

### 6.5 Execution Trace 结构

```ts
export interface ExecutionTrace {
  traceId: string;
  runId: string;
  agentId: string;
  requestedCapability: string;
  tool: {
    toolId: string;
    ensName: string;
    manifestUri: string;
    manifestHash: string;
    version: string;
    ownerAddress: `0x${string}`;
  };
  discovery: {
    capabilityIndexUri?: string;
    candidateCount: number;
    selectedReason: string;
    resolvedAt: string;
  };
  verification: {
    manifestHashValid: boolean;
    ownerValid: boolean;
    schemaValid: boolean;
    versionCompatible: boolean;
    rejectedReason?: string;
    verifiedAt: string;
  };
  invocation: {
    transport: 'axl';
    peerId: string;
    method: string;
    requestUri?: string;
    responseUri?: string;
    startedAt: string;
    finishedAt?: string;
    status: 'pending' | 'ok' | 'error' | 'rejected';
  };
  io: {
    inputHash: string;
    outputHash?: string;
    inputSchemaRef?: string;
    outputSchemaRef?: string;
  };
  artifacts: Array<{
    kind: 'tool-output' | 'audit-report' | 'log' | 'finding';
    uri: string;
    hash: string;
    mediaType: string;
  }>;
  storage: {
    traceUri: string;
    persistedAt: string;
    backend: '0g-storage';
  };
}
```

### 6.6 Audit Report 结构

```ts
export interface AuditReport {
  reportId: string;
  contractName?: string;
  summary: string;
  findings: Array<{
    id: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    title: string;
    description: string;
    evidence?: string;
    traceId: string;
    toolId: string;
  }>;
  suggestedTests?: Array<{
    title: string;
    description: string;
    traceId: string;
  }>;
  generatedAt: string;
}
```

## 7. SDK 模块拆分

SDK 应围绕 domain service 组织，而不是围绕底层供应商 SDK 组织。

### 7.1 包内模块

| 模块 | 责任 | 关键接口 |
| --- | --- | --- |
| `identity` | ENS 解析、identity 规范化 | `resolveIdentity`, `readEnsRecords` |
| `discovery` | capability index 查询与候选排序 | `discoverTools` |
| `verification` | manifest hash/owner/schema/version 校验 | `verifyManifest`, `validateInput`, `validateOutput` |
| `invocation` | AXL 请求封装、超时、响应解析 | `invokeTool` |
| `trace` | trace 构建、hash、持久化 | `createTrace`, `persistTrace` |
| `storage` | 0G Storage/KV adapter | `putBlob`, `getBlob`, `putIndex`, `queryIndex` |
| `manifest` | manifest 读写、canonicalization | `loadManifest`, `publishManifest` |
| `reporting` | 汇总 findings 生成 demo audit report | `buildAuditReport` |

### 7.2 SDK 对外 API

```ts
export interface OpenToolMeshClient {
  publishManifest(input: PublishManifestInput): Promise<PublishManifestResult>;
  discoverTools(input: DiscoverToolsInput): Promise<DiscoveredTool[]>;
  resolveIdentity(input: ResolveIdentityInput): Promise<ToolIdentity>;
  loadManifest(input: LoadManifestInput): Promise<ToolManifest>;
  verifyManifest(input: VerifyManifestInput): Promise<ManifestVerificationResult>;
  invokeTool<TInput, TOutput>(input: InvokeToolInput<TInput>): Promise<ToolInvocationResponse<TOutput>>;
  recordTrace(input: RecordTraceInput): Promise<RecordTraceResult>;
  buildAuditReport(input: BuildAuditReportInput): Promise<AuditReport>;
}
```

### 7.3 关键输入输出

```ts
export interface DiscoverToolsInput {
  capability: string;
  versionRange?: string;
  limit?: number;
}

export interface ManifestVerificationResult {
  ok: boolean;
  toolId: string;
  checks: {
    manifestHashValid: boolean;
    ownerValid: boolean;
    schemaValid: boolean;
    versionCompatible: boolean;
  };
  errors: string[];
}

export interface InvokeToolInput<TInput> {
  capability: string;
  tool: ToolIdentity;
  manifest: ToolManifest;
  agentId: string;
  input: TInput;
  traceId: string;
}
```

## 8. CLI 命令设计

CLI 只做最小闭环，不追求完整运维面。

### 8.1 命令列表

```bash
opentool publish --manifest ./manifests/solidity-pattern-scanner.json
opentool resolve --tool solidity-scanner.auditagent.eth
opentool discover --capability solidity-static-analysis
opentool verify --tool solidity-scanner.auditagent.eth
opentool call --tool solidity-scanner.auditagent.eth --input ./fixtures/vault.sol.json
opentool trace --trace <trace-id>
```

### 8.2 命令职责

| 命令 | 职责 | 必要输出 |
| --- | --- | --- |
| `publish` | 上传 manifest 到 0G、更新 capability index、提示 ENS 记录信息 | manifest URI、hash、version |
| `resolve` | 解析 ENS identity | ENS name、owner、manifest pointer |
| `discover` | 按 capability 查候选 | tool list、versions |
| `verify` | 对 manifest 做完整校验 | checks + errors |
| `call` | 发起远程调用并可选写 trace | request id、status、trace uri |
| `trace` | 拉取 trace 和 artifacts 摘要 | discovery/verification/invocation/memory overview |

## 9. Tool Node 设计

### 9.1 MVP 节点

1. `solidity-pattern-scanner`
2. `test-case-suggester`（P1 推荐）

### 9.2 Tool Node 接口契约

AXL message payload 应当承载一个稳定 RPC envelope，而不是直接透传任意 JSON。

```ts
export interface AxlInvokeEnvelope {
  kind: 'otm.tool.invoke';
  request: ToolInvocationRequest;
}

export interface AxlResultEnvelope {
  kind: 'otm.tool.result';
  response: ToolInvocationResponse;
}
```

### 9.3 Tool Node 生命周期

1. 节点注册本地 capability 配置。
2. 节点启动 AXL server，监听 `invokeTool`。
3. 收到请求后校验 `manifestHash` 与 `toolId` 是否匹配本节点配置。
4. 执行 scanner 逻辑。
5. 产出 findings / suggestions。
6. 返回结构化 response，不直接写 trace；trace 由 agent 端统一负责。

### 9.4 Solidity Pattern Scanner 输出建议

```ts
export interface SolidityStaticAnalysisOutput {
  findings: Array<{
    ruleId: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    title: string;
    message: string;
    location?: {
      file: string;
      lineStart: number;
      lineEnd?: number;
    };
  }>;
  summary: {
    totalFindings: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
}
```

## 10. Dashboard 设计

Dashboard 是评审理解链路的关键，必须以单次 audit run 为中心。

### 10.1 页面结构

| 页面 | 路径 | 目的 |
| --- | --- | --- |
| Run List | `/runs` | 浏览 demo runs |
| Run Detail | `/runs/[traceId]` | 展示完整链路 |
| Tool Catalog | `/tools` | 查看已发布工具与 capability |
| Tool Detail | `/tools/[toolId]` | 查看 manifest、version、owner |

### 10.2 Run Detail 四大区块

1. `Discovery`
   - requested capability
   - candidate tools
   - selected tool identity
   - ENS name
2. `Manifest`
   - manifest URI
   - manifest hash
   - owner
   - version
   - schema validation status
3. `Invocation`
   - AXL peer id
   - call started/finished
   - request status
   - input/output hashes
4. `Memory`
   - trace URI
   - artifact URIs
   - final report
   - referenced trace ids

### 10.3 Dashboard 数据来源

- 优先从 0G KV 读 trace summary、tool catalog summary。
- 详情页再从 0G Storage 拉完整 manifest / trace / report blob。
- Next.js 可提供 server actions 或 route handlers 封装读取逻辑，避免浏览器端直接持有所有访问凭据。

## 11. 仓库目录建议

建议直接建立 monorepo：

```text
/workspace/project
├── apps/
│   ├── dashboard/
│   │   ├── app/
│   │   │   ├── runs/
│   │   │   ├── tools/
│   │   │   └── api/
│   │   ├── components/
│   │   └── lib/
│   ├── audit-agent-example/
│   │   ├── src/
│   │   │   ├── run-audit.ts
│   │   │   ├── capabilities/
│   │   │   └── report/
│   │   └── fixtures/
│   └── tool-node-solidity-scanner/
│       ├── src/
│       │   ├── server.ts
│       │   ├── scanner/
│       │   └── handlers/
│       └── manifests/
├── packages/
│   ├── sdk/
│   │   ├── src/
│   │   │   ├── client/
│   │   │   ├── identity/
│   │   │   ├── discovery/
│   │   │   ├── verification/
│   │   │   ├── invocation/
│   │   │   ├── trace/
│   │   │   ├── storage/
│   │   │   ├── manifest/
│   │   │   ├── reporting/
│   │   │   └── types/
│   │   └── tests/
│   ├── cli/
│   │   ├── src/
│   │   │   ├── commands/
│   │   │   └── index.ts
│   │   └── tests/
│   ├── schemas/
│   │   ├── src/
│   │   │   ├── manifest.ts
│   │   │   ├── trace.ts
│   │   │   └── invocation.ts
│   │   └── tests/
│   ├── adapters-ens/
│   │   └── src/
│   ├── adapters-0g/
│   │   └── src/
│   └── adapters-axl/
│       └── src/
├── docs/
│   ├── architecture/
│   │   ├── opentool-mesh-mvp-architecture.md
│   │   ├── manifest-schema.md
│   │   ├── trace-schema.md
│   │   └── module-interfaces.md
│   ├── product/
│   └── demo/
├── manifests/
│   ├── solidity-pattern-scanner.manifest.json
│   └── test-case-suggester.manifest.json
├── scripts/
│   ├── publish-tool.ts
│   ├── seed-capability-index.ts
│   └── demo-run.ts
├── package.json
├── pnpm-workspace.yaml
├── turbo.json
└── tsconfig.base.json
```

## 12. 模块接口建议

### 12.1 `packages/schemas`

职责：单独沉淀所有 schema 与共享类型，避免 dashboard、SDK、CLI 各自复制结构。

导出：

```ts
export { toolManifestSchema } from './manifest';
export { executionTraceSchema } from './trace';
export { toolInvocationRequestSchema, toolInvocationResponseSchema } from './invocation';
```

### 12.2 `packages/adapters-ens`

职责：只封装 ENS 读取与写入，不包含业务判断。

```ts
export interface EnsAdapter {
  resolveTextRecords(ensName: string): Promise<Record<string, string | undefined>>;
  resolveOwner(ensName: string): Promise<`0x${string}` | null>;
  setTextRecords?(ensName: string, records: Record<string, string>): Promise<void>;
}
```

### 12.3 `packages/adapters-0g`

职责：统一 blob / kv 存取抽象。

```ts
export interface BlobStorageAdapter {
  putJson(namespace: string, value: unknown): Promise<{ uri: string; hash: string }>;
  getJson<T>(uri: string): Promise<T>;
}

export interface KvIndexAdapter {
  put(key: string, value: unknown): Promise<void>;
  get<T>(key: string): Promise<T | null>;
  listByPrefix?<T>(prefix: string): Promise<T[]>;
}
```

### 12.4 `packages/adapters-axl`

职责：抽象 AXL 客户端和服务端，SDK 不直接依赖具体网络实现细节。

```ts
export interface InvocationTransport {
  invoke<TReq, TRes>(peerId: string, method: string, payload: TReq, timeoutMs: number): Promise<TRes>;
}
```

### 12.5 `packages/sdk`

内部 client 负责把各 adapter 串联起来：

```ts
export interface OpenToolMeshClientDeps {
  ens: EnsAdapter;
  blob: BlobStorageAdapter;
  kv: KvIndexAdapter;
  transport: InvocationTransport;
}
```

## 13. API / Route 建议

如果 dashboard 需要 server-side route，可采用：

| Method | Path | 用途 |
| --- | --- | --- |
| `GET` | `/api/tools?capability=solidity-static-analysis` | 列出 capability 候选工具 |
| `GET` | `/api/tools/:toolId` | 获取 tool identity + latest manifest summary |
| `GET` | `/api/traces/:traceId` | 获取 trace detail |
| `GET` | `/api/runs` | 获取 demo runs 列表 |
| `POST` | `/api/demo/run-audit` | 触发 demo contract audit run（仅 demo 环境） |

### 13.1 `GET /api/tools?capability=...`

响应示例：

```json
{
  "capability": "solidity-static-analysis",
  "tools": [
    {
      "toolId": "otm:ens:solidity-scanner.auditagent.eth",
      "ensName": "solidity-scanner.auditagent.eth",
      "version": "0.1.0",
      "manifestUri": "0g://manifests/solidity-scanner/0.1.0.json",
      "manifestHash": "sha256:abc123"
    }
  ]
}
```

### 13.2 `GET /api/traces/:traceId`

响应示例：

```json
{
  "traceId": "trace_01",
  "requestedCapability": "solidity-static-analysis",
  "tool": {
    "toolId": "otm:ens:solidity-scanner.auditagent.eth",
    "manifestHash": "sha256:abc123",
    "version": "0.1.0"
  },
  "verification": {
    "manifestHashValid": true,
    "ownerValid": true,
    "schemaValid": true,
    "versionCompatible": true
  },
  "invocation": {
    "peerId": "axl-peer-solidity-01",
    "status": "ok"
  },
  "storage": {
    "traceUri": "0g://traces/trace_01.json"
  }
}
```

## 14. 具体实现顺序

### Phase 0: 仓库初始化

1. 创建 monorepo 根配置：`package.json`、`pnpm-workspace.yaml`、`turbo.json`、`tsconfig.base.json`
2. 建 `packages/schemas`
3. 建 `packages/sdk` 基础 client 与 types

### Phase 1: Discovery + Verification 基础闭环

1. 实现 `adapters-ens`
2. 实现 `adapters-0g`
3. 定义 manifest schema 与 canonical hash 规则
4. 完成 `discoverTools` 与 `verifyManifest`
5. 用 fixtures 做单元测试

### Phase 2: Invocation + Trace 闭环

1. 实现 `adapters-axl`
2. 实现 `invokeTool`
3. 实现 `recordTrace`
4. 搭建 `tool-node-solidity-scanner`
5. 跑通本地 E2E 脚本

### Phase 3: Demo Surface

1. 创建 `audit-agent-example`
2. 创建 `apps/dashboard`
3. 打通 `run-audit -> trace -> report`
4. 完成一条演示数据流

### Phase 4: P1 增强

1. 第二个 tool node
2. owner signature verification
3. manifest version mismatch rejection demo
4. dashboard artifact preview
5. 0G Chain pointer / event

## 15. 测试策略

### 15.1 必测范围

| 范围 | 测试类型 |
| --- | --- |
| manifest schema | unit |
| manifest canonical hash | unit |
| capability discovery | unit/integration |
| ENS resolution fallback | integration |
| invocation request/response validation | unit |
| trace persistence | integration |
| demo audit run | end-to-end |
| dashboard run detail render | end-to-end |

### 15.2 最低测试命令建议

```bash
pnpm test
pnpm --filter @opentoolmesh/sdk test
pnpm --filter @opentoolmesh/dashboard test
pnpm demo:run
pnpm demo:e2e
```

## 16. 关键非功能约束

1. 所有 manifest、trace、report 必须可序列化为稳定 JSON，便于 hash 与复盘。
2. hash 统一使用 canonical JSON + sha256，避免字段顺序导致漂移。
3. dashboard 展示的是 verifiable provenance，不追求完全执行环境重放。
4. tool node 与 agent 必须是独立进程，不能用本地函数直接替代 AXL 调用。
5. capability index 可以很小，但 agent 代码中不能写死 tool endpoint。

## 17. 风险与裁剪策略

### 17.1 主要风险

| 风险 | 影响 | 裁剪策略 |
| --- | --- | --- |
| AXL SDK 集成不稳定 | 阻塞远程调用闭环 | 先做 transport interface，保留 mock transport，真实 AXL 作为 P0 完成项并尽早验证 |
| 0G SDK 文档不清晰 | 阻塞 manifest/trace 持久化 | 先封装 blob/kv 接口，允许临时 local adapter 对接测试 |
| ENS 写入流程复杂 | 阻塞 publish demo | MVP 可预先部署一个 ENS identity，CLI 先覆盖读取和验证路径 |
| 扫描工具能力不足 | 审计 demo 弱 | 先做 deterministic pattern scanner，结果稳定即可 |

### 17.2 明确允许的黑客松取舍

1. capability index 可以由单一 0G KV namespace 承载。
2. ENS 可先使用 text records 而非复杂 resolver 扩展。
3. tool output artifact 可以先存 JSON，不强制二进制附件。
4. owner signature verification 可延后到 P1，但 manifest owner 地址和 ENS owner 校验应保留。

## 18. 推荐文档拆分

当前文档足以作为总架构基线，后续建议补 3 份子文档：

1. `manifest-schema.md`
2. `trace-schema.md`
3. `module-interfaces.md`

这样开发时可以按契约编码，不必反复从总文档提取结构。

## 19. 结论

OpenTool Mesh 的黑客松 MVP 应被实现为一个 TypeScript monorepo infra project，而不是单页 demo。最小成立条件不是“页面能展示”，而是以下链路可验证地跑通：

1. tool manifest 发布到 0G
2. ENS identity 指向 manifest
3. capability index 可发现该工具
4. agent 能验证 manifest
5. agent 通过 AXL 调用独立 tool node
6. trace 写回 0G
7. dashboard 可展示 discovery / manifest / invocation / memory 四段链路

只要以上闭环成立，OpenTool Mesh 就能被评委理解为一个去中心化 agent tool discovery + invocation + memory layer，而不是写死 endpoint 的 demo application。
