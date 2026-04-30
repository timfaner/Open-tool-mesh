# OpenTool Mesh Hackathon MVP Architecture Draft

This file is a preserved English version of the original MVP architecture draft. For current implementation guidance, prefer [System Overview](./system-overview.md), [Module Boundaries](./module-boundaries.md), and [Runtime Lifecycle](./runtime-lifecycle.md).

## 1. Document Goal

Define a hackathon-scale architecture for an auditable agent tool invocation loop. The architecture should be small enough to build quickly and concrete enough to demo with real commands, traces, and dashboard evidence.

## 2. MVP Technical Conclusion

Recommended stack:

- TypeScript workspace.
- Shared contract package.
- SDK package for runtime orchestration.
- CLI package for command access.
- Local HTTP tool node.
- Reference audit-agent example.
- Next.js dashboard.
- Local filesystem adapters for ENS-style identity, 0G-style storage/KV, and AXL-style invocation semantics.

Architecture principles:

- Build one complete loop before adding breadth.
- Keep protocol semantics visible even when adapters are local.
- Keep CLI thin and SDK reusable.
- Persist evidence so the demo can be replayed.
- Keep the dashboard read-only.

## 3. System Context and Responsibility Boundary

Core roles:

- Agent: asks for a capability and invokes a selected tool.
- Tool provider: publishes a manifest and serves a tool node.
- SDK: performs discovery, verification, invocation, and persistence.
- CLI: exposes publish and invocation paths.
- Dashboard: explains the run.

Boundary summary:

- ENS-style records provide identity and manifest pointer semantics.
- 0G-style storage stores manifests, traces, artifacts, and reports.
- 0G-style KV stores indexes and summaries.
- AXL-style semantics describe the invocation envelope.
- MCP-compatible fields describe tool schemas.

## 4. MVP High-Level Architecture

```text
agent / CLI
  -> SDK
    -> local identity records
    -> local capability index
    -> local manifest storage
    -> remote tool-node HTTP endpoint
    -> local trace/report storage
  -> dashboard read-only review
```

The MVP should demonstrate the protocol shape without requiring real decentralized infrastructure.

## 5. Core Data Flows

### Publish Flow

Manifest JSON is written to local storage, identity records are updated, and the capability index is populated.

### Discovery Flow

The agent asks for a capability and receives candidate tool identities from the index.

### Verify Flow

The SDK loads the manifest and checks identity binding, hash, schema version, and SDK compatibility.

### Call Flow

The SDK sends an AXL-style request envelope to the configured tool-node endpoint.

### Trace Flow

The SDK persists tool output, trace, report, and summary metadata for later review.

## 6. Core Data Models

### Tool Identity Model

The identity model should link:

- Tool ID.
- Owner address.
- Manifest URI.
- Capability entries.

### Manifest Structure

The manifest should include:

- `schemaVersion`
- `toolId`
- `owner`
- `capabilities`
- `mcp`
- `invocation`
- `storage`
- `compatibility`
- `integrity`

### Capability Index Structure

The index maps capability names to candidate tool IDs and manifest references.

### Invocation Request and Response

The invocation envelope should include request ID, tool ID, method, input, and response status/output.

### Execution Trace Structure

The trace should include requested capability, selected tool, verification result, invocation metadata, artifacts, and storage metadata.

### Audit Report Structure

The report should reference the trace ID and summarize findings from the tool output.

## 7. SDK Module Split

Suggested internal areas:

- Identity and discovery.
- Manifest loading and verification.
- Invocation transport.
- Trace and artifact storage.
- Report construction.
- Local devnet adapter.

Suggested public API:

- `resolveIdentity`
- `discoverTools`
- `loadManifest`
- `verifyManifest`
- `invokeTool`
- `recordTrace`
- `saveArtifact`
- `publishManifest`
- `buildAuditReport`

## 8. CLI Command Design

Suggested commands:

- `publish`
- `discover`
- `verify`
- `call`
- Demo wrapper commands through workspace scripts.

The CLI should call SDK methods and print enough structured evidence for users to confirm success.

## 9. Tool Node Design

The MVP node is `solidity-pattern-scanner`.

Required endpoints:

- `GET /health`
- `POST /invokeTool`

The node should return deterministic structured output for the sample contract so that tests, traces, and dashboard output can stay aligned.

## 10. Dashboard Design

The dashboard should show:

- Discovery result.
- Manifest verification.
- Invocation details.
- Trace/artifact/report persistence.
- Final audit report.

It should prefer latest runtime data and use fixtures only as fallback.

## 11. Repository Directory Suggestion

The implemented repository uses:

- `packages/shared`
- `packages/sdk`
- `packages/cli`
- `services/tool-node`
- `examples/audit-agent`
- `apps/dashboard`
- `docs`

## 12. Module Interface Suggestion

Shared contracts should be imported by SDK, CLI, examples, tool-node, and dashboard code as needed. Runtime behavior should live in the SDK. UI and demo code should not become alternative sources of protocol truth.

## 13. API and Route Suggestions

Potential future HTTP routes:

- `GET /api/tools?capability=...`
- `GET /api/traces/:traceId`

These are not required for the current MVP unless the dashboard or demo needs them.

## 14. Implementation Order

Phase 0: initialize workspace and packages.

Phase 1: implement discovery and verification foundation.

Phase 2: implement invocation and trace persistence.

Phase 3: implement demo surface and dashboard.

Phase 4: add P1 enhancements only after the core loop works.

## 15. Test Strategy

Minimum test coverage:

- Shared contract helpers.
- SDK discovery and verification.
- CLI command behavior.
- Tool-node invocation handler.
- Audit-agent run path.
- Dashboard runtime-data selection.

Minimum command:

```bash
corepack pnpm test
```

For demo changes:

```bash
corepack pnpm demo:run
```

## 16. Non-Functional Constraints

- Keep the demo deterministic.
- Keep local adapter behavior explicit in docs.
- Keep generated runtime state out of source-controlled assumptions.
- Keep command output useful for verification.

## 17. Risks and Scope Cuts

Main risks:

- Confusing local adapters with real network integrations.
- Letting the dashboard drift from trace/report schemas.
- Expanding scope before the loop is stable.

Allowed hackathon tradeoffs:

- Local filesystem storage instead of real decentralized storage.
- Local HTTP transport instead of real AXL transport.
- One sample tool and one sample capability.

## 18. Recommended Document Split

The draft has been split into implementation-facing docs:

- [System Overview](./system-overview.md)
- [Module Boundaries](./module-boundaries.md)
- [Runtime Lifecycle](./runtime-lifecycle.md)
- [Module Interfaces](./module-interfaces.md)
- [Manifest Schema](./manifest-schema.md)
- [Trace Schema](./trace-schema.md)

## 19. Conclusion

The MVP should be judged by whether it proves one complete, auditable, reproducible remote tool invocation loop. Additional features should wait until that loop is reliable.
