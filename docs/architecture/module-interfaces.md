# Module Interface Reference

This document summarizes the interfaces between packages in the current MVP.

## Read This After

Read [System Overview](./system-overview.md) and [Module Boundaries](./module-boundaries.md) first. This page assumes you already know the main package responsibilities.

## Contract Source of Truth

The source of truth is the TypeScript implementation:

- `packages/shared/src/manifest.ts`
- `packages/shared/src/trace.ts`
- `packages/shared/src/invocation.ts`
- `packages/shared/src/index.ts`
- `packages/sdk/src/client/create-client.ts`

The docs describe current behavior but should not drift from those files.

## Dependency Direction

```text
packages/shared -> packages/sdk -> packages/cli
                              -> examples/audit-agent
services/tool-node <- HTTP invocation
apps/dashboard <- runtime files and fixtures
```

## Core Interfaces

| Interface | Owner | Consumers |
| --- | --- | --- |
| `ToolManifest` | `packages/shared` | SDK, CLI, tool node, dashboard |
| `ToolIdentity` | `packages/shared` / SDK local devnet | SDK, CLI, audit agent |
| Invocation envelope | `packages/shared` | SDK, tool node |
| Trace | `packages/shared` | SDK, audit agent, dashboard |
| Audit report | SDK/example code | audit agent, dashboard |

## Shared to SDK

### `ToolManifest`

Represents the published tool description. It includes:

- `schemaVersion`
- `toolId`
- `owner`
- `capabilities`
- `mcp`
- `invocation`
- `storage`
- `compatibility`
- `integrity`

### `ToolIdentity`

Represents the resolved identity binding for a tool. In the MVP, it is backed by local ENS-style records and points to a manifest URI and owner address.

## SDK Public Use Cases

### `resolveIdentity(input)`

Resolve a tool identity to owner and manifest pointer metadata.

### `discoverTools(input)`

Return candidate tools for a requested capability.

### `loadManifest(input)`

Load a manifest from local 0G-style storage.

### `verifyManifest(input)`

Verify manifest hash, owner binding, schema version, and SDK compatibility.

### `invokeTool(input)`

Send an invocation envelope to the configured tool node.

### `recordTrace(input)`

Persist an execution trace and related summary metadata.

### `saveArtifact(input)`

Persist a runtime artifact such as tool output or an audit report.

### `publishManifest(input)`

Publish a manifest into local runtime storage and update local identity/index state.

### `buildAuditReport(input)`

Build an audit report from a trace and tool output.

## CLI as a Thin Shell

The CLI owns:

- Command parsing.
- User-facing output.
- Command-specific validation.

The SDK owns:

- Runtime behavior.
- Storage and local devnet writes.
- Discovery and verification logic.
- Invocation and trace persistence.

When adding a command, prefer calling SDK methods instead of duplicating runtime code inside `packages/cli`.

## Tool Node Invocation Boundary

The tool node receives an invocation request over HTTP and returns structured output. It should not know how discovery, identity resolution, or trace persistence works.

Relevant files:

- `services/tool-node/src/server.ts`
- `services/tool-node/src/handlers/invoke-tool.ts`
- `packages/shared/src/invocation.ts`

## Audit Agent as a Reference Consumer

The audit agent is an example consumer of the SDK. It should show how an external agent integrates with OpenTool Mesh without becoming the SDK implementation itself.

Relevant files:

- `examples/audit-agent/src/run-audit.ts`
- `examples/audit-agent/src/capabilities/required-capabilities.ts`
- `examples/audit-agent/src/report/build-report.ts`

## Dashboard Read Boundary

The dashboard reads runtime state and fixtures. It should not create or mutate runtime artifacts.

Relevant file:

- `apps/dashboard/lib/demo-run.ts`

## Minimal Interaction Example

```ts
const client = createOpenToolClient();

const tools = await client.discoverTools({
  capability: "solidity-static-analysis",
});

const selected = tools[0];
const identity = await client.resolveIdentity({ toolId: selected.toolId });
const manifest = await client.loadManifest({ manifestUri: identity.manifestUri });
const verification = await client.verifyManifest({ manifest, identity });

if (!verification.ok) {
  throw new Error("manifest verification failed");
}

const output = await client.invokeTool({
  manifest,
  input: { source: contractSource },
});
```

## In Scope vs Out of Scope

In scope:

- Local MVP discovery and invocation contracts.
- SDK and CLI boundaries.
- Tool-node HTTP invocation.
- Dashboard runtime-data reads.

Out of scope:

- Production decentralized verification.
- Payment and settlement interfaces.
- Multi-tenant authorization.
- General marketplace APIs.

## Code Entry Points

- `packages/shared/src/`
- `packages/sdk/src/client/create-client.ts`
- `packages/sdk/src/client/local-devnet.ts`
- `packages/cli/src/commands/`
- `services/tool-node/src/`
- `examples/audit-agent/src/run-audit.ts`
- `apps/dashboard/lib/demo-run.ts`
