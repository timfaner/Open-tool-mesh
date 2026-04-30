# OpenTool Mesh Product Scope and Acceptance

## 1. Product Positioning

OpenTool Mesh is an MVP for auditable agent-to-tool invocation. It proves that an agent can discover a remote tool by capability, verify its manifest and identity binding, invoke it through a tool node, and persist evidence as trace and report artifacts.

The product is intentionally narrow. It is designed to demonstrate a trustworthy invocation loop, not to ship a general marketplace, billing system, or production-grade security scanner.

## 2. Target Users and Use Cases

Primary users:

- Agent developers who need a repeatable way to discover and call remote tools.
- Tool providers who want to publish tool metadata and expose a callable endpoint.
- Demo operators who need a clear story and dashboard for a hackathon-scale presentation.
- Contributors who need a small but coherent repository for improving the protocol surface.

Core use cases:

- Publish a tool manifest.
- Discover tools by capability.
- Verify the discovered manifest before invocation.
- Invoke a remote tool node.
- Persist trace, artifact, and report evidence.
- Review the run in the dashboard.

## 3. Core Narrative

The demo narrative is:

1. The agent asks for a capability, not a hard-coded endpoint.
2. Discovery returns a candidate tool identity.
3. Identity resolution points to a manifest.
4. Verification checks manifest integrity, owner binding, schema version, and SDK compatibility.
5. Invocation happens through an independent remote tool node.
6. The run writes trace and report evidence into local 0G-style storage.
7. The dashboard shows the full evidence chain.

## 4. Responsibility Layers

### 4.1 Identity and Discovery

The capability index maps requested capabilities to candidate tool identities. ENS-style records provide the manifest pointer and owner root.

### 4.2 Manifest and Verification

The manifest declares tool identity, capabilities, MCP-compatible tool metadata, invocation metadata, storage pointers, compatibility, and integrity fields. Verification checks that the manifest and resolved identity agree.

### 4.3 Invocation

The SDK wraps requests in an AXL-style envelope and sends them to a remote tool node over local HTTP transport in the MVP implementation.

### 4.4 Memory and Report

The runtime writes traces, tool-output artifacts, and audit reports to `.opentoolmesh/`. The dashboard reads this runtime state before falling back to fixture data.

## 5. Product Boundary

OpenTool Mesh is:

- A protocol-oriented MVP for remote agent tool calls.
- A reference SDK and CLI for publish, discovery, verification, invocation, trace, and report flows.
- A local devnet implementation for ENS-style identity, 0G-style storage, KV indexing, and AXL-style invocation semantics.
- A demo dashboard for explaining the loop.

OpenTool Mesh is not:

- A production decentralized network integration.
- A general tool marketplace.
- A billing, settlement, or payment platform.
- A multi-tenant agent orchestration product.
- A production audit framework.

## 6. Relationship to MCP

The MVP uses MCP-compatible manifest ideas for tool metadata and schemas, but it is not a replacement for MCP. The project focuses on discovery, identity binding, verification, invocation evidence, and replayable traces around a tool call.

## 7. Hackathon MVP Goal

The final MVP should show one coherent Solidity audit-agent scenario:

- One capability: `solidity-static-analysis`
- One tool node: `solidity-pattern-scanner`
- One reference agent: `audit-agent-example`
- One dashboard run detail view
- One persisted trace and one audit report linked to that trace

The demo succeeds when a reviewer can run the commands from the repository root and see the same publish, discover, verify, call, trace, and report chain reflected in both CLI output and dashboard state.

## 8. MVP Scope

Required:

- Manifest schema and sample manifest.
- CLI commands for publish, discover, verify, and call paths.
- SDK client methods for identity resolution, discovery, manifest loading, verification, invocation, trace recording, artifact saving, manifest publishing, and audit-report construction.
- Local devnet persistence under `.opentoolmesh/`.
- Tool node with `/health` and `/invokeTool`.
- Audit-agent example.
- Dashboard that reads the latest successful runtime trace first.

Recommended:

- Clear demo preflight and health-check commands.
- Consistent fixtures for fallback display.
- Documentation that matches the real source paths.

Explicitly out of scope:

- Real ENS, 0G, or AXL network integration.
- Payments or settlement.
- User accounts and permissions.
- Multi-agent orchestration.
- General-purpose marketplace workflows.

## 9. Minimum Product Requirements

### SDK

The SDK must expose a coherent client API for:

- `resolveIdentity`
- `discoverTools`
- `loadManifest`
- `verifyManifest`
- `invokeTool`
- `recordTrace`
- `saveArtifact`
- `publishManifest`
- `buildAuditReport`

### CLI

The CLI should remain a thin shell over SDK behavior. It should demonstrate publish, discover, verify, call, and trace/report outputs without duplicating business logic.

### Dashboard

The dashboard should be read-only. It should prefer the latest successful runtime trace and only fall back to fixture data when no valid runtime trace exists.

## 10. Acceptance Criteria

### Tool publishing

Acceptance is met when `corepack pnpm demo:publish` writes a manifest to local storage, updates identity records, and updates the capability index.

### Agent discovery

Acceptance is met when `corepack pnpm demo:run` or the audit-agent example discovers a tool by `solidity-static-analysis`.

### Manifest verification

Acceptance is met when verification reports success for manifest hash, owner binding, schema compatibility, and SDK compatibility checks.

### Remote invocation

Acceptance is met when the agent invokes `services/tool-node` through the configured endpoint and receives a structured tool output.

### Trace persistence

Acceptance is met when the run writes a trace under `.opentoolmesh/storage/traces/` and related artifacts/reports under the matching runtime storage paths.

### Dashboard explanation

Acceptance is met when the dashboard presents discovery, manifest, invocation, memory, and report data from the same run without mixing runtime and fixture data.

## 11. Priority Levels

P0 is the minimum loop required for the project to stand:

- Publish manifest.
- Discover by capability.
- Verify manifest.
- Invoke remote tool node.
- Persist trace and report.
- Show the run in the dashboard.

P1 improves demo strength:

- Better preflight checks.
- More precise dashboard alignment.
- Clearer report output.
- Stronger validation tests.

P2 is optional enhancement:

- More capabilities.
- Additional tool-node examples.
- Richer dashboard filtering.
- Deeper protocol simulation.

## 12. Minimal Data Examples

The canonical concrete examples live in:

- `services/tool-node/manifests/solidity-pattern-scanner.manifest.json`
- `examples/audit-agent/fixtures/sample-execution-trace.json`
- `examples/audit-agent/fixtures/sample-report.json`

Use those files as the source of truth for current field names.

## 13. Development and Demo Requirements

Implementation constraints:

- Keep docs aligned with source paths.
- Do not claim real decentralized integration when the MVP uses local adapters.
- Keep CLI and SDK responsibilities separated.
- Keep dashboard data read-only.

Dashboard requirements:

- Show the full lifecycle.
- Identify whether data is runtime or fixture fallback.
- Keep trace, artifact, report, and manifest fields from the same run.

Suggested demo explanation order:

1. Capability request.
2. Discovery and identity resolution.
3. Manifest verification.
4. Remote tool-node invocation.
5. Trace and report persistence.
6. Dashboard replay.

## 14. Reusable README Description

OpenTool Mesh is an open-source MVP for auditable agent tool invocation. It connects capability discovery, manifest verification, remote tool-node execution, trace persistence, and audit reporting into a reproducible loop.

## 15. Final Conclusion

The project should be judged by whether it demonstrates one reliable, explainable, evidence-backed remote tool invocation loop. Any feature that does not improve that loop should remain outside the MVP unless it directly supports the demo or verification story.
