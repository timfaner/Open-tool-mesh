# Trace Contract Reference

This document explains the execution trace used by the current MVP.

## Position in the Doc Set

Read this after [Runtime Lifecycle](./runtime-lifecycle.md). The trace is the persisted evidence record for one invocation.

## Source of Truth

Use these files as the implementation source:

- `packages/shared/src/trace.ts`
- `packages/sdk/src/client/create-client.ts`
- `examples/audit-agent/fixtures/sample-execution-trace.json`
- `apps/dashboard/lib/demo-run.ts`

## What a Trace Is For

A trace records the important facts of one tool invocation:

- Which capability was requested.
- Which tool was selected.
- Which manifest was verified.
- Which request was sent.
- Which response and artifacts were produced.
- Where the persisted evidence lives.

## Top-Level Shape

The current trace includes:

```text
traceId
requestedCapability
tool
discovery
verification
invocation
io
artifacts
storage
events
```

## Key Fields

### `tool`

Selected tool identity, manifest URI, manifest hash, and related tool metadata.

### `discovery`

Discovery result and candidate-selection context.

### `verification`

Verification outcome and checks used before invocation.

### `invocation`

AXL-style peer, method, request envelope, response metadata, and invocation status.

### `io`

Input/output summary for the invocation.

### `artifacts`

References to persisted artifacts such as tool output and audit report.

### `storage`

Trace URI and persisted timestamp.

## Lifecycle Events

Events should describe meaningful lifecycle transitions, such as discovery, verification, invocation, trace persistence, and report generation. They are for review and debugging, not for driving application state.

## Minimal Successful Example

```json
{
  "traceId": "trace_example",
  "requestedCapability": "solidity-static-analysis",
  "tool": {
    "toolId": "solidity-pattern-scanner.opentool.eth",
    "manifestUri": "opentool://manifests/solidity-pattern-scanner.json",
    "manifestHash": "sha256:example"
  },
  "verification": {
    "ok": true,
    "checks": []
  },
  "invocation": {
    "peerId": "local-tool-node",
    "method": "invokeTool",
    "status": "ok"
  },
  "artifacts": [],
  "storage": {
    "traceUri": "opentool://traces/trace_example.json",
    "persistedAt": "2026-04-28T00:00:00.000Z"
  }
}
```

For exact current fields, use `examples/audit-agent/fixtures/sample-execution-trace.json`.

## How a Trace Is Produced

### CLI Path

CLI commands call SDK methods and persist the resulting trace through the client.

### Agent Example Path

`examples/audit-agent/src/run-audit.ts` performs discovery, verification, invocation, artifact persistence, trace recording, and report construction.

### SDK Persistence Path

`packages/sdk/src/client/create-client.ts` writes trace JSON and summary metadata through the local devnet adapter.

## How a Trace Is Consumed

### CLI Read Path

CLI output uses trace IDs, URIs, and report paths as command success evidence.

### Dashboard Read Path

`apps/dashboard/lib/demo-run.ts` selects the latest successful runtime trace, loads related artifact/report/manifest files, and falls back to fixtures only when no valid runtime trace exists.

## Relationship to Invocation Envelopes

The invocation envelope is the request/response transport structure. The trace is the persisted review artifact that references the invocation and surrounding discovery, verification, and storage context.

## Debugging Checklist

When a dashboard field looks wrong, check:

- The latest successful trace under `.opentoolmesh/storage/traces/`.
- The artifact URIs referenced by that trace.
- The report file referenced by the `audit-report` artifact.
- The manifest URI referenced by `trace.tool.manifestUri`.
- Whether the dashboard fell back to fixtures.

## Related Code Entry Points

- `packages/shared/src/trace.ts`
- `packages/sdk/src/client/create-client.ts`
- `examples/audit-agent/src/run-audit.ts`
- `examples/audit-agent/fixtures/sample-execution-trace.json`
- `apps/dashboard/lib/demo-run.ts`
