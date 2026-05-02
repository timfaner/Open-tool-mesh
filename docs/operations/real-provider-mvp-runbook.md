# Real Provider MVP Runbook

This runbook records the operational path for running the OpenTool Mesh MVP against real provider services instead of the local `.opentoolmesh/` adapters.

Last verified: 2026-05-01.

## What This Proves

The provider-backed smoke covers this loop:

```text
publish manifest -> upload to 0G Storage -> write ENS text records -> write 0G KV capability index -> discover by capability -> resolve ENS -> download 0G manifest -> verify -> invoke through AXL -> store request/response/output/report -> write 0G trace -> mirror the provider run for the dashboard
```

The verified setup used:

- Public Sepolia RPC for ENS.
- A controlled ENS name on Sepolia.
- 0G Galileo testnet RPC and storage indexer.
- A locally hosted 0G KV node.
- The sample tool node as the local AXL-compatible MCP bridge.
- 0G Storage for manifest, invocation artifacts, audit report, and execution trace.
- 0G KV for capability discovery and trace summary records.

Do not commit real private keys. Keep `.env.provider` local; the file is intentionally ignored by git.

## Prerequisites

- Node.js 22 or newer.
- Workspace dependencies installed with `corepack pnpm install`.
- A wallet funded on Sepolia and 0G Galileo.
- Control over the ENS name or subname used by `OTM_ENS_NAME`.
- A 32-byte `OTM_0G_KV_STREAM_ID`.
- A running 0G KV node that monitors that stream.

The public 0G KV example endpoint is not stable enough to use as product infrastructure. Use a provider-maintained KV node or run your own node with [0G KV Node Runbook](./0g-kv-node-runbook.md).

## Environment File

Create `.env.provider` from `.env.provider.example`:

```sh
cp .env.provider.example .env.provider
```

Use this shape for the verified testnet path:

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

Notes:

- `OTM_ENS_RPC_URL` is the Ethereum RPC used by ENS reads and writes.
- `OTM_0G_RPC_URL` is the 0G Galileo EVM RPC.
- `OTM_0G_INDEXER_RPC` is the 0G Storage indexer.
- `OTM_0G_KV_NODE_URL` is the HTTP JSON-RPC endpoint for the KV node, not the EVM RPC.
- `OTM_GENSYN_AXL_API_URL=http://127.0.0.1:4318` uses the sample tool node's MCP bridge for local AXL-compatible invocation.

## Prepare 0G KV

Build and run the KV node outside this repository. The detailed setup is in [0G KV Node Runbook](./0g-kv-node-runbook.md).

Use the same stream ID in both places:

```text
.env.provider:        OTM_0G_KV_STREAM_ID=0xabc...
config.otm-galileo:   stream_ids = ["abc..."]
```

For local testing, the node should listen on:

```toml
rpc_enabled = true
rpc_listen_address = "127.0.0.1:6789"
```

Check the node before the smoke run:

```sh
curl -s http://127.0.0.1:6789 \
  -H 'content-type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"kv_getStatus","params":[]}'

curl -s http://127.0.0.1:6789 \
  -H 'content-type: application/json' \
  -d '{"jsonrpc":"2.0","id":2,"method":"kv_getHoldingStreamIds","params":[]}'
```

The first command should return `true`. The second should include the `OTM_0G_KV_STREAM_ID` value.

## Start the Local AXL Bridge

The sample tool node exposes both the normal tool endpoint and an AXL-compatible MCP bridge:

```text
GET  /health
POST /invokeTool
POST /mcp/{peer}/{service}
```

Start it in one terminal:

```sh
corepack pnpm demo:tool-node
```

Then confirm health:

```sh
curl -s http://127.0.0.1:4318/health
```

Expected result:

```json
{"ok":true,"capability":"solidity-static-analysis"}
```

## Provider Preflight

Before writing to ENS or 0G, run the read-only preflight:

```sh
corepack pnpm provider:preflight
```

This validates `.env.provider`, checks provider SDK dependencies, confirms the ENS and 0G EVM RPC endpoints respond to `eth_chainId`, checks 0G KV status and stream ownership, and checks either the local tool-node bridge `/health` endpoint or a real AXL node `/topology` endpoint.

For local-only validation without network calls:

```sh
corepack pnpm provider:preflight -- --no-network
```

Preflight does not publish a manifest, write ENS records, write 0G KV entries, upload 0G artifacts, or invoke the tool. It is a readiness check before the write-producing smoke.

## Run the Provider Smoke

Run the full provider-backed smoke from the repository root:

```sh
corepack pnpm provider:smoke -- --full
```

`--full` is equivalent to `--call`. The script loads `.env.provider`, publishes the manifest, discovers the tool by `solidity-static-analysis`, resolves the ENS identity, downloads the manifest from 0G Storage, verifies it, invokes the tool through AXL, stores invocation artifacts and the report in 0G, writes the execution trace to 0G, and writes a local dashboard mirror under `.opentoolmesh/storage/`.

Successful output includes:

```json
{
  "profile": "provider-testnet",
  "discover": {
    "requestedCapability": "solidity-static-analysis",
    "candidateCount": 1
  },
  "verify": {
    "ok": true
  },
  "call": {
    "status": "ok"
  },
  "trace": {
    "traceUri": "0g://root/<trace-root-hash>"
  },
  "report": {
    "reportUri": "0g://root/<report-root-hash>"
  }
}
```

The verified run produced a provider-backed manifest URI in this form:

```text
0g://root/<rootHash>
```

The full run should also produce provider-backed URIs for:

- invocation request
- invocation response
- tool output
- audit report
- execution trace

The dashboard mirror is local and intentionally separate from provider persistence. It lets `apps/dashboard` read the latest provider run while preserving the real `0g://root/...` URIs in the displayed provenance fields.

## Audit the Provider Acceptance Evidence

After the full smoke command succeeds, audit the latest dashboard mirror:

```sh
corepack pnpm provider:acceptance
```

To audit a specific trace mirror:

```sh
corepack pnpm provider:acceptance -- --trace <trace-id-or-path>
```

This is a read-only local check. It intentionally rejects local demo traces and only accepts `provider-live-smoke` traces whose manifest, invocation request, invocation response, tool output, audit report, and execution trace all use real provider-style `0g://root/...` URIs and have local dashboard mirrors.

## Open the Dashboard After a Provider Run

After `provider:smoke -- --full` succeeds, start the dashboard:

```sh
corepack pnpm dashboard:dev
```

Open:

```text
http://127.0.0.1:3000/
```

The dashboard chooses the latest successful trace from `.opentoolmesh/storage/traces/`. For provider smoke runs, that trace is a dashboard mirror whose manifest, artifact, report, and trace fields point at the real 0G roots produced by the smoke command.

## Provider Acceptance Checklist

Before presenting the run, confirm the smoke output and dashboard show:

- `requestedCapability=solidity-static-analysis`
- one discovered candidate
- `resolvedIdentity=otm:ens:<your-tool-name>`
- provider manifest URI in `0g://root/<hash>` form
- manifest hash, owner, version, and schema status
- `transport=axl`
- AXL peer from the manifest
- tool call status `ok`
- input hash and output hash
- trace URI in `0g://root/<hash>` form
- final report URI in `0g://root/<hash>` form
- `corepack pnpm provider:acceptance` returns `"ok": true`

## Troubleshooting

- `client chain not configured. universalResolverAddress is required`: the ENS adapter must pass Sepolia chain metadata to viem for `provider-testnet`.
- `network does not support ENS` during 0G KV writes: the 0G KV adapter must pass the 0G Galileo Flow contract address, not the 0G RPC URL, into `getFlowContract`.
- `invalid arrayify value`: do not pre-base64 the 0G KV key before calling `KvClient.getValue`; the SDK handles key encoding.
- `Unexpected end of JSON input` on the first KV read: treat empty KV values as missing entries and write the initial capability index.
- KV status hangs or times out: do not rely on the public example KV endpoint. Run a local or provider-managed KV node.

## Cleanup

Stop the two long-running local services when the smoke run is complete:

```sh
# Terminal running the tool node
Ctrl-C

# Terminal running zgs_kv
Ctrl-C
```

Leave `.env.provider` local. It contains live credentials and must not be committed.
