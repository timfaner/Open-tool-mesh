# Runtime Lifecycle

This document follows one successful run through OpenTool Mesh.

## End-to-End Flow

```text
manifest JSON
  -> publish
  -> capability index and identity records
  -> discover
  -> resolve identity
  -> load manifest
  -> verify manifest
  -> invoke tool node
  -> persist trace and artifacts
  -> build audit report
  -> dashboard read
```

## 1. Publish Flow

The publish flow starts with the sample manifest:

- `services/tool-node/manifests/solidity-pattern-scanner.manifest.json`

The CLI and SDK write:

- Manifest blob under `.opentoolmesh/storage/manifests/`
- ENS-style record in `.opentoolmesh/ens-records.json`
- Capability index entry under `.opentoolmesh/kv/`
- Tool-node peer mapping in `.opentoolmesh/axl-peers.json`

Relevant code:

- `packages/cli/src/commands/publish.ts`
- `packages/sdk/src/client/create-client.ts`
- `packages/sdk/src/client/local-devnet.ts`

## 2. Discover and Resolve Flow

Discovery starts from a capability name, such as `solidity-static-analysis`.

The SDK:

1. Reads the capability index.
2. Returns candidate tool identities.
3. Resolves the selected identity through ENS-style records.
4. Loads the manifest pointer for that identity.

Relevant code:

- `packages/sdk/src/client/create-client.ts`
- `examples/audit-agent/src/run-audit.ts`

## 3. Verify Flow

Manifest verification checks:

- Manifest hash.
- Owner binding.
- Schema version.
- SDK compatibility.

This is MVP-local verification over local adapter data. It is not production chain verification.

Relevant code:

- `packages/sdk/src/client/create-client.ts`
- `packages/shared/src/manifest.ts`

## 4. Call Flow

The SDK wraps the request in an AXL-style invocation envelope and sends it to the configured tool-node HTTP endpoint.

Relevant code:

- `packages/sdk/src/client/create-client.ts`
- `packages/shared/src/invocation.ts`
- `services/tool-node/src/server.ts`
- `services/tool-node/src/handlers/invoke-tool.ts`

## 5. Trace and Report Flow

After invocation, the runtime persists:

- Tool-output artifact.
- Execution trace.
- Audit report.
- Trace summary in local KV.

Relevant code:

- `packages/sdk/src/client/create-client.ts`
- `examples/audit-agent/src/report/build-report.ts`
- `examples/audit-agent/src/run-audit.ts`

## 6. Dashboard Read Flow

The dashboard reads runtime data in this order:

1. Find successful traces under `.opentoolmesh/storage/traces/`.
2. Choose the latest successful trace by persisted timestamp.
3. Load the artifact, report, and manifest referenced by that trace.
4. If no valid runtime trace exists, load the fixture baseline.

Relevant code:

- `apps/dashboard/lib/demo-run.ts`
- `examples/audit-agent/fixtures/`

## 7. Runtime State Locations

| State | Location |
| --- | --- |
| ENS-style records | `.opentoolmesh/ens-records.json` |
| AXL peer map | `.opentoolmesh/axl-peers.json` |
| Capability index | `.opentoolmesh/kv/` |
| Manifests | `.opentoolmesh/storage/manifests/` |
| Traces | `.opentoolmesh/storage/traces/` |
| Artifacts | `.opentoolmesh/storage/artifacts/` |
| Reports | `.opentoolmesh/storage/reports/` |

## Suggested Source Pairing

Read this document together with:

- [Module Interfaces](./module-interfaces.md)
- [Manifest Schema](./manifest-schema.md)
- [Trace Schema](./trace-schema.md)
- [Demo Runbook](../demo/opentool-mesh-demo-runbook.md)
