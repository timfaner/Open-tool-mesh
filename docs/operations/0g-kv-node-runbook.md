# 0G KV Node Runbook

This runbook records how to run a controlled 0G KV Node for OpenTool Mesh provider testing. The node is the value behind `OTM_0G_KV_NODE_URL`; it is separate from the 0G EVM RPC URL.

## When This Is Needed

Use this path when no stable provider-maintained 0G KV endpoint is available. The public SDK example currently points to `http://3.101.147.150:6789`, but that address should be treated as an example node, not production infrastructure.

## Requirements

- Rust/Cargo toolchain. The upstream repository currently pins Rust through its own `rust-toolchain`.
- Linux packages: `clang cmake build-essential pkg-config libssl-dev protobuf-compiler`.
- macOS packages: `llvm cmake`. With Homebrew: `brew install llvm cmake protobuf`.
- Network access to the 0G Galileo EVM RPC and 0G storage/indexer services.
- A generated OpenTool Mesh KV stream ID.
- A host that can expose the KV HTTP RPC port to the process running OpenTool Mesh.

The upstream hardware guidance is modest for a small test stream: 4 GB RAM, 2 CPU cores, and disk sized to the streams being replayed.

## Generate the Stream ID

OpenTool Mesh uses the `0x`-prefixed form in `.env.provider` and SDK calls:

```sh
node -e "const crypto=require('node:crypto'); console.log('0x'+crypto.randomBytes(32).toString('hex'))"
```

The 0G KV node config expects the same value without `0x`:

```sh
OTM_0G_KV_STREAM_ID=0x1234...
KV_NODE_STREAM_ID=1234...
```

Keep the same stream ID for one environment. Changing it creates a new empty KV namespace.

## Build the Node

Keep the upstream node outside this repository so third-party source and build artifacts do not enter the OpenTool Mesh tree:

```sh
git clone -b v1.5.1 https://github.com/0gfoundation/0g-storage-kv.git ~/Work/0g-storage-kv
cd ~/Work/0g-storage-kv
cargo build --release
```

The binary is:

```sh
target/release/zgs_kv
```

If CMake 4 fails while compiling `prost-build` with a message about compatibility with CMake `< 3.5`, rerun the build with:

```sh
CMAKE_POLICY_VERSION_MINIMUM=3.5 cargo build --release
```

## Configure Galileo Testnet

Start from the upstream testnet template:

```sh
cd ~/Work/0g-storage-kv/run
cp config_testnet_turbo.toml config.otm-galileo.toml
```

Set these fields:

```toml
stream_ids = ["<OTM_0G_KV_STREAM_ID without 0x>"]

db_dir = "db/otm-galileo"
kv_db_file = "kv.otm-galileo.DB"

blockchain_rpc_endpoint = "https://evmrpc-testnet.0g.ai"
log_contract_address = "0x22E03a6A89B950F1c82ec5e74F8eCa321a105296"
log_sync_start_block_number = 1

rpc_enabled = true
rpc_listen_address = "0.0.0.0:6789"

indexer_url = "https://indexer-storage-testnet-turbo.0g.ai"
zgs_node_urls = ""
```

Notes:

- `rpc_listen_address` is the endpoint OpenTool Mesh will call through `OTM_0G_KV_NODE_URL`.
- `stream_ids` must include every stream the node should replay.
- Keep `log_sync_start_block_number` at or before the first KV write for the stream. For a brand-new stream, `1` is safe but slower; after the first write is known, a later block can reduce replay work.
- `blockchain_rpc_endpoint` is the 0G EVM RPC used to sync Flow contract events.
- `log_contract_address` is the 0G Galileo Storage Flow contract address.
- `indexer_url` is used to discover storage node locations. If it is empty, configure `zgs_node_urls` with static storage node RPC URLs.
- The upstream `config_testnet_turbo.toml` may contain an older indexer hostname. Use the currently reachable/tested Galileo indexer URL above unless 0G publishes a replacement.

## Start the Node

Run it from the `run` directory so relative DB and log paths stay local to that runtime directory:

```sh
cd ~/Work/0g-storage-kv/run
../target/release/zgs_kv --config config.otm-galileo.toml
```

For local-only testing on the same machine:

```sh
OTM_0G_KV_NODE_URL=http://127.0.0.1:6789
```

For a remote host, expose the port through a firewall rule or reverse proxy:

```sh
OTM_0G_KV_NODE_URL=http://<host>:6789
```

Prefer an HTTPS reverse proxy for any shared test environment:

```sh
OTM_0G_KV_NODE_URL=https://kv.<domain>
```

## OpenTool Mesh Environment

Use the `0x`-prefixed stream ID in `.env.provider`:

```sh
OTM_STORAGE_PROVIDER=0g
OTM_0G_RPC_URL=https://evmrpc-testnet.0g.ai
OTM_0G_INDEXER_RPC=https://indexer-storage-testnet-turbo.0g.ai
OTM_0G_PRIVATE_KEY=0x...
OTM_0G_KV_NODE_URL=http://127.0.0.1:6789
OTM_0G_KV_STREAM_ID=0x...
```

Then run the provider smoke:

```sh
corepack pnpm provider:smoke
```

Use `-- --call` only after the ENS, 0G, and AXL endpoints all point at live test services:

```sh
corepack pnpm provider:smoke -- --call
```

## Operational Checks

Before using the node:

```sh
curl -s http://127.0.0.1:6789 \
  -H 'content-type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"kv_getStatus","params":[]}'
```

Confirm it is monitoring the expected stream:

```sh
curl -s http://127.0.0.1:6789 \
  -H 'content-type: application/json' \
  -d '{"jsonrpc":"2.0","id":2,"method":"kv_getHoldingStreamIds","params":[]}'
```

Real OpenTool Mesh readiness is proven by a provider-backed publish/discover smoke on the configured stream.

The official Go storage client can also write/read a direct KV fixture:

```sh
git clone https://github.com/0gfoundation/0g-storage-client.git ~/Work/0g-storage-client
cd ~/Work/0g-storage-client
go build

./0g-storage-client kv-write \
  --url https://evmrpc-testnet.0g.ai \
  --key <private_key> \
  --indexer https://indexer-storage-testnet-turbo.0g.ai \
  --stream-id <stream_id> \
  --stream-keys foo \
  --stream-values bar

./0g-storage-client kv-read \
  --node http://127.0.0.1:6789 \
  --stream-id <stream_id> \
  --stream-keys foo
```

If reads stay empty after writes:

- Confirm `.env.provider` uses `OTM_0G_KV_STREAM_ID` with `0x`.
- Confirm `config.otm-galileo.toml` uses the same stream without `0x`.
- Confirm `log_sync_start_block_number` is not after the first write.
- Confirm the configured indexer URL resolves from the node host.
- Restart with a clean `db_dir`/`kv_db_file` only when intentionally rebuilding local replay state.
- If build fails at `prost-build` or protobuf generation, confirm `cmake` and `protobuf-compiler`/`protobuf` are installed and visible on `PATH`.
- If CMake 4 rejects an older embedded protobuf CMake policy, set `CMAKE_POLICY_VERSION_MINIMUM=3.5` for the build command.

## Sources

- 0G Storage KV repository: https://github.com/0gfoundation/0g-storage-kv
- 0G Storage KV release v1.5.1: https://github.com/0gfoundation/0g-storage-kv/releases/tag/v1.5.1
- 0G Storage SDK KV docs: https://docs.0g.ai/developer-hub/building-on-0g/storage/sdk
- 0G Testnet Overview: https://docs.0g.ai/developer-hub/testnet/testnet-overview
- 0G Storage Client repository: https://github.com/0gfoundation/0g-storage-client
