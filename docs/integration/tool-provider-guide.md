# Tool Provider Guide

This guide is for publishing a callable OpenTool Mesh tool against the real provider profile.

## Provider Responsibilities

A provider must supply four things:

1. An ENS-controlled tool identity.
2. A manifest stored in 0G Storage.
3. One or more capabilities indexed in 0G KV.
4. An AXL-reachable tool node that accepts the manifest invocation method.

For the current MVP, the reference tool is the Solidity scanner:

- identity: `otm:ens:<controlled-name>`
- capability: `solidity-static-analysis`
- AXL method: `invokeTool`
- input schema: `{ source: string }`
- output schema: `{ findings, summary }`

## Manifest Fields

The manifest must include:

- `toolId`: `otm:ens:<controlled-name>`
- `version`: semantic version for compatibility checks
- `owner.address`: the owner address that matches ENS resolution
- `capabilities[].id`: at least one capability, for example `solidity-static-analysis`
- `mcp.inputSchema` and `mcp.outputSchema`: schemas used before and after invocation
- `invocation.transport`: `axl`
- `invocation.axlPeerId`: the AXL peer or bridge peer
- `invocation.axlMethod`: the JSON-RPC/tool method, currently `invokeTool`
- `integrity.manifestHash`: computed by the SDK before publish

The reference file is:

```text
manifests/solidity-pattern-scanner.manifest.json
```

## Environment

Create `.env.provider` from the example:

```sh
cp .env.provider.example .env.provider
```

Required provider values:

```sh
OTM_PROVIDER_PROFILE=provider-testnet
OTM_ENS_PROVIDER=ens
OTM_ENS_RPC_URL=https://ethereum-sepolia-rpc.publicnode.com
OTM_ENS_NAME=<controlled-name>.eth
OTM_ENS_PUBLISHER_PRIVATE_KEY=0x...
OTM_TOOL_OWNER_ADDRESS=0x...

OTM_STORAGE_PROVIDER=0g
OTM_0G_RPC_URL=https://evmrpc-testnet.0g.ai
OTM_0G_INDEXER_RPC=https://indexer-storage-testnet-turbo.0g.ai
OTM_0G_PRIVATE_KEY=0x...
OTM_0G_KV_NODE_URL=http://127.0.0.1:6789
OTM_0G_KV_STREAM_ID=0x...

OTM_GENSYN_AXL_API_URL=http://127.0.0.1:4318
```

Do not commit `.env.provider`.

## Expose the Tool Node

For the Solidity scanner reference tool:

```sh
corepack pnpm demo:tool-node
```

The node exposes:

```text
GET  /health
POST /invokeTool
POST /mcp/{peer}/{service}
```

For a true AXL deployment, point `OTM_GENSYN_AXL_API_URL` at the local Gensyn AXL HTTP API and make sure the AXL route reaches the tool service. For the bridge smoke path, point it at the reference tool node.

## Publish and Verify

Before writing to providers, run a read-only readiness check:

```sh
corepack pnpm provider:preflight
```

Use `-- --no-network` if you only want local env and dependency validation.

Run:

```sh
corepack pnpm provider:smoke
```

This publishes the manifest, writes ENS text records, writes the 0G KV capability index, resolves ENS, reloads the 0G manifest, and verifies hash/owner/schema/version compatibility.

For full acceptance evidence:

```sh
corepack pnpm provider:smoke -- --full
```

The full run additionally invokes the tool, stores request/response/output/report artifacts in 0G, writes an execution trace to 0G, and mirrors the trace for dashboard display.

Agents connected through MCP can publish a manifest with `opentoolmesh_publish_tool` instead of shelling out to the CLI. Pass either `manifestPath` or a full `manifest` object. After publishing, use `opentoolmesh_discover_tools`, `opentoolmesh_resolve_tool`, and `opentoolmesh_verify_tool` to prove the indexed capability and identity before invoking.

Audit the latest local dashboard mirror after the full run:

```sh
corepack pnpm provider:acceptance
```

This command is read-only. It rejects local demo traces and only passes when the latest `provider-live-smoke` mirror points at real provider-style `0g://root/...` URIs for the manifest, request, response, output, report, and trace.

## Acceptance Evidence

A provider run is demo-ready when the output contains:

- `publish.manifestUri` as `0g://root/<hash>`
- `discover.requestedCapability=solidity-static-analysis`
- `discover.candidateCount>=1`
- `resolve.latestManifestUri` matching the published 0G URI
- `verify.ok=true`
- `call.status=ok`
- `trace.traceUri` as `0g://root/<hash>`
- `report.reportUri` as `0g://root/<hash>`
- `corepack pnpm provider:acceptance` returns `"ok": true`

The dashboard should then show Discovery, Manifest, Invocation, Memory, and Final Audit Report for that same run.
