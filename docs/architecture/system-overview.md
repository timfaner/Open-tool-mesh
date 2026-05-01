# System Overview

OpenTool Mesh currently implements an MVP loop for remote agent tool invocation. A manifest describes a tool, a capability index and ENS-style identity records help an agent discover it, the SDK verifies the manifest before invocation, a remote tool node executes the request, and trace/report evidence is written for dashboard review.

## Core Lifecycle

The system follows this order:

```text
publish -> discover -> resolve -> verify -> call -> trace -> report
```

- `publish`: the CLI reads a manifest and writes it through the SDK into local 0G-style storage, ENS-style records, and a capability index.
- `discover`: an agent or CLI command finds candidate tools by capability.
- `resolve`: the SDK resolves the selected tool identity to a manifest pointer and owner metadata.
- `verify`: the SDK checks manifest hash, owner, schema version, and SDK compatibility.
- `call`: the SDK wraps the request in an AXL-style envelope and calls the local HTTP tool-node transport.
- `trace`: request, response, tool output, and summary metadata are persisted under `.opentoolmesh/`.
- `report`: an audit report is generated and persisted; the dashboard reads the latest successful runtime data first.

## Main Modules

### `packages/shared`

Shared contract layer and cross-module source of truth for manifest, trace, invocation, and report types.

### `packages/sdk`

Runtime orchestration layer. It combines identity resolution, discovery, verification, invocation, tracing, artifact persistence, publishing, and report construction into a client API. The core implementation is `packages/sdk/src/client/create-client.ts`.

### `packages/cli`

Thin command layer over the SDK. `publish` writes manifests and indexes; `call` exercises the full CLI invocation path.

### `services/tool-node`

Remote execution layer. It exposes:

- `GET /health`
- `POST /invokeTool`

### `examples/audit-agent`

Reference consumer. `examples/audit-agent/src/run-audit.ts` demonstrates discovery, verification, remote invocation, trace persistence, and report generation from an agent point of view.

### `apps/dashboard`

Read-only explanation layer. `apps/dashboard/lib/demo-run.ts` prefers the latest successful runtime trace and falls back to fixtures only when runtime data is unavailable.

## Component Boundaries

| Component | Owns | Does Not Own |
| --- | --- | --- |
| ENS-style records | Identity entrypoint, manifest pointer, owner root | Manifest storage, capability search, remote invocation |
| 0G-style storage | Manifest, trace, report, tool-output JSON blobs | Identity resolution, P2P transport |
| 0G-style KV | Capability index, trace summary | Immutable blob storage, owner trust root |
| AXL semantics | Agent/tool-node request and response envelope | Discovery, schema management, trace persistence |
| MCP-compatible manifest | Input/output schema, tool name, invocation metadata | Distributed discovery, execution history |

## Local Devnet Mapping

The repository does not connect directly to real ENS, 0G, or AXL networks. `packages/sdk/src/client/local-devnet.ts` maps those concepts into `.opentoolmesh/`:

- `ens-records.json`: ENS-style text records and owner addresses.
- `axl-peers.json`: peer IDs mapped to local HTTP base URLs.
- `kv/`: capability index and trace summaries.
- `storage/`: manifest, trace, artifact, and report JSON blobs.

In this MVP, ENS, 0G, and AXL terms describe interface semantics implemented by local filesystem adapters.

## Real Provider Integration Direction

The local devnet boundary is intentionally shaped like provider adapters. The design target is to keep `packages/sdk/src/client/create-client.ts` stable and replace only the dependencies supplied to it:

- ENS text records replace `.opentoolmesh/ens-records.json` for manifest URI, manifest hash, owner, version, and capability metadata.
- 0G Storage replaces `.opentoolmesh/storage/` for manifests, traces, reports, and artifacts.
- 0G KV replaces `.opentoolmesh/kv/` for capability indexes and trace summaries.
- Gensyn AXL replaces the local AXL peer map for remote tool invocation over a P2P mesh.

Read [Real Provider Integration Notes](./real-provider-integration.md) before implementing provider-backed adapters. The current repository still defaults to local adapters for tests and demos.

## Real Code Entry Points

- Publish path: `packages/cli/src/commands/publish.ts` and `packages/cli/src/commands/helpers.ts`
- CLI invocation path: `packages/cli/src/commands/call.ts`
- Agent invocation path: `examples/audit-agent/src/run-audit.ts`
- Remote execution: `services/tool-node/src/handlers/invoke-tool.ts`
- Dashboard data path: `apps/dashboard/lib/demo-run.ts`

## Current MVP Scope

The implemented scope is limited to the Solidity audit-agent demo loop:

- Capability: `solidity-static-analysis`
- Tool node: `solidity-pattern-scanner`
- Reference agent: `audit-agent-example`
- Dashboard: a read-only view of publish, discover, verify, call, trace, and report steps

## Current Non-Goals

The repository does not currently ship:

- A generic tool marketplace.
- Payments or settlement.
- Multi-tenant permissions.
- A multi-agent orchestration platform.
- Real decentralized backend integration.
