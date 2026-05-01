# Real Provider MVP Runbook

This runbook records the operational path for running the OpenTool Mesh MVP against real provider services instead of the local `.opentoolmesh/` adapters.

Last verified: 2026-05-01.

## What This Proves

The provider-backed smoke covers this loop:

```text
publish manifest -> upload to 0G Storage -> write ENS text records -> write 0G KV capability index -> resolve ENS -> download manifest -> verify -> invoke through local AXL bridge
```

The verified setup used:

- Public Sepolia RPC for ENS.
- A controlled ENS name on Sepolia.
- 0G Galileo testnet RPC and storage indexer.
- A locally hosted 0G KV node.
- The sample tool node as the local AXL-compatible MCP bridge.

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

## Run the Provider Smoke

Run the full provider-backed smoke from the repository root:

```sh
corepack pnpm provider:smoke -- --call
```

The script loads `.env.provider`, publishes the manifest, resolves the ENS identity, downloads the manifest from 0G Storage, verifies it, and invokes the tool through the local AXL bridge.

Successful output includes:

```json
{
  "profile": "provider-testnet",
  "verify": {
    "ok": true
  },
  "call": {
    "status": "ok"
  }
}
```

The verified run produced a provider-backed manifest URI in this form:

```text
0g://root/<rootHash>
```

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
