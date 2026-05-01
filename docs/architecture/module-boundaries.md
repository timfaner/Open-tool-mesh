# Module Boundaries

This document explains what each package owns and how dependencies should flow.

## Package Responsibilities

### `packages/shared`

Owns shared TypeScript types and schema-shaped contracts. Other packages should import shared contract types from here instead of redefining them.

### `packages/sdk`

Owns runtime orchestration:

- Identity resolution
- Capability discovery
- Manifest loading and verification
- Tool invocation
- Trace recording
- Artifact persistence
- Manifest publishing
- Audit-report construction

### `packages/cli`

Owns command-line parsing, user-facing command output, and thin wiring to SDK methods. It should not duplicate SDK business logic.

### `services/tool-node`

Owns remote execution behavior and the HTTP boundary for the sample tool node.

### `examples/audit-agent`

Owns the reference consumer flow. It demonstrates how an agent uses the SDK and remote tool node.

### `apps/dashboard`

Owns the read-only UI and runtime-data selection logic. It should not mutate `.opentoolmesh/` state.

## Actual Dependency Direction

The intended direction is:

```text
packages/shared
  -> packages/sdk
    -> packages/cli
    -> examples/audit-agent
services/tool-node
apps/dashboard
```

Notes:

- `packages/sdk` depends on shared contracts.
- CLI and examples use SDK behavior rather than reimplementing it.
- Tool node is invoked over HTTP and should not depend on agent internals.
- Dashboard reads runtime output and fixtures; it is not part of the invocation path.

## Important Boundary Facts

### Publishing the index is not only an SDK concern

The publish flow writes both blob storage and index/identity metadata. Keep manifest storage, identity records, and capability index behavior consistent when changing this path.

### `verifyManifest()` is MVP verification

Verification checks fields that exist in the local MVP: hash, owner binding, schema version, and SDK compatibility. It is not a substitute for production chain verification.

### Provider adapters must stay behind SDK interfaces

Real ENS, 0G, and Gensyn AXL integration should be added as dependency implementations for the SDK client. CLI commands, the audit-agent example, and dashboard readers should not learn provider-specific APIs unless a separate boundary document explicitly changes that contract.

### The dashboard is read-only

Dashboard code should choose the latest valid runtime data and fall back to fixtures when needed. It should not generate traces, rewrite reports, or patch missing manifests.

## Layering Rules

- Shared types should not import SDK, CLI, tool-node, example, or dashboard code.
- SDK should expose reusable runtime behavior.
- Provider implementations should plug into SDK dependency interfaces instead of bypassing them.
- CLI should stay close to command orchestration.
- Example agent should show consumer behavior, not core runtime logic.
- Tool node should only own execution behavior.
- Dashboard should only read and display evidence.

## Source Files Worth Reading

- `packages/shared/src/index.ts`
- `packages/shared/src/manifest.ts`
- `packages/shared/src/trace.ts`
- `packages/shared/src/invocation.ts`
- `packages/sdk/src/client/create-client.ts`
- `packages/sdk/src/client/local-devnet.ts`
- `packages/cli/src/index.ts`
- `services/tool-node/src/server.ts`
- `services/tool-node/src/handlers/invoke-tool.ts`
- `examples/audit-agent/src/run-audit.ts`
- `apps/dashboard/lib/demo-run.ts`
