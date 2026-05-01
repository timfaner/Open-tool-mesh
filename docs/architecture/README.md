# Architecture Docs

This directory explains the current OpenTool Mesh implementation. Prefer these docs over older planning notes when you need to understand the repository as it exists today.

## Recommended Reading Order

1. [System Overview](./system-overview.md)
2. [Module Boundaries](./module-boundaries.md)
3. [Runtime Lifecycle](./runtime-lifecycle.md)
4. [Module Interfaces](./module-interfaces.md)
5. [Real Provider Integration Notes](./real-provider-integration.md)
6. [Manifest Schema](./manifest-schema.md)
7. [Trace Schema](./trace-schema.md)

The older [MVP Architecture Draft](./opentool-mesh-mvp-architecture.md) remains useful as background, but the implementation-facing docs above should be treated as the default source.

## Entry Points by Reader Type

### New Contributors

Read:

- [System Overview](./system-overview.md)
- [Module Boundaries](./module-boundaries.md)
- [Runtime Lifecycle](./runtime-lifecycle.md)

### SDK and CLI Maintainers

Read:

- [Module Interfaces](./module-interfaces.md)
- [Real Provider Integration Notes](./real-provider-integration.md)
- [Manifest Schema](./manifest-schema.md)
- [Trace Schema](./trace-schema.md)

### Demo and Dashboard Maintainers

Read:

- [Runtime Lifecycle](./runtime-lifecycle.md)
- [Trace Schema](./trace-schema.md)
- [Demo Runbook](../demo/opentool-mesh-demo-runbook.md)
- [0G KV Node Runbook](../operations/0g-kv-node-runbook.md)

## What This Set Covers

- Current package responsibilities.
- Real dependency direction.
- Manifest and trace contract shapes.
- Runtime state persistence under `.opentoolmesh/`.
- Dashboard runtime-data selection.
- The design path from local MVP adapters to ENS, 0G, and Gensyn AXL provider adapters.
- Source files worth reading.

## Contract Doc Status

The schema docs are implementation notes, not external protocol standards. The source of truth remains the TypeScript code and sample JSON fixtures referenced by each document.

## Current Non-Goals

The current repository does not implement:

- Real ENS, 0G, or AXL network integration.
- A generic tool marketplace.
- Payments or settlement.
- Multi-tenant permissions.
- Multi-agent orchestration.

## Code Entry Points

| Area | Path |
| --- | --- |
| Shared contracts | `packages/shared/src/` |
| SDK client | `packages/sdk/src/client/create-client.ts` |
| Local devnet | `packages/sdk/src/client/local-devnet.ts` |
| Provider integration design | `docs/architecture/real-provider-integration.md` |
| 0G KV node operations | `docs/operations/0g-kv-node-runbook.md` |
| CLI entrypoint | `packages/cli/src/index.ts` |
| Tool node | `services/tool-node/src/server.ts` |
| Invocation handler | `services/tool-node/src/handlers/invoke-tool.ts` |
| Audit agent | `examples/audit-agent/src/run-audit.ts` |
| Dashboard data | `apps/dashboard/lib/demo-run.ts` |
