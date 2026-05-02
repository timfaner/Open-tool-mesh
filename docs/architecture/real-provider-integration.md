# Real Provider Integration Notes

This document records the current provider research and the design direction for moving OpenTool Mesh from local MVP adapters to real service providers.

Last researched: 2026-04-30.

## Scope

The current codebase already has the right adapter shape:

- `EnsAdapter` for identity and text-record resolution.
- `BlobStorageAdapter` for manifest, trace, report, and artifact blobs.
- `KvIndexAdapter` for capability indexes and trace summaries.
- `InvocationTransport` for agent-to-tool-node calls.

The local implementation in `packages/sdk/src/client/local-devnet.ts` should remain the default for tests and repeatable demos. Real provider work should add provider-backed implementations behind the same interfaces instead of changing SDK orchestration behavior.

## Provider Role Map

| OpenTool Mesh role | Current local adapter | Real provider target | First integration use |
| --- | --- | --- | --- |
| Tool identity | `.opentoolmesh/ens-records.json` | ENS resolver text records | Resolve manifest URI, manifest hash, owner, version, and capability metadata from a controlled ENS name. |
| Blob storage | `.opentoolmesh/storage/` | 0G Storage SDK | Store manifests, traces, tool outputs, and reports by content root or transaction metadata. |
| KV index | `.opentoolmesh/kv/` | 0G Storage KV | Store capability indexes and trace summaries when provider-backed discovery is enabled. |
| Invocation transport | Local HTTP peer map in `.opentoolmesh/axl-peers.json` | Gensyn AXL | Route invocation envelopes or MCP tool calls through a P2P mesh peer ID instead of a local base URL. |
| Work verification / reputation | Local manifest checks only | Gensyn protocol, later | Future layer for verifiable ML/tool-work evaluation, reputation, or economic settlement. Not required for the first provider-backed invocation loop. |

`AXL` in this document means Gensyn AXL. It does not mean Axelar.

## Gensyn and AXL

### What the docs imply

Gensyn is a decentralized network for machine intelligence with components for execution, verification, communication, and coordination. Its current public docs position the broader protocol around verifiable AI training, inference, evaluation, and payments.

For the current OpenTool Mesh MVP, the immediate Gensyn integration target is AXL, not the full Gensyn verification or settlement stack. Gensyn AXL is a standalone P2P node that exposes a local HTTP API, uses ed25519 peer identity, and supports MCP and A2A routing. It is the closest real provider match for the existing `InvocationTransport` boundary.

### Setup notes

Official AXL setup is repository based:

```sh
git clone https://github.com/gensyn-ai/axl
cd axl
make build
openssl genpkey -algorithm ed25519 -out private.pem
./node -config node-config.json
```

The config file should include a stable private key path and either public peers or a listen address:

```json
{
  "PrivateKeyPath": "private.pem",
  "Peers": ["tls://<bootstrap-host>:9001"],
  "Listen": [],
  "api_port": 9002,
  "bridge_addr": "127.0.0.1",
  "router_addr": "http://127.0.0.1",
  "router_port": 9003,
  "a2a_addr": "",
  "a2a_port": 9004
}
```

Important AXL defaults and endpoints:

- Local HTTP API defaults to `127.0.0.1:9002`.
- `GET /topology` returns local peer identity and mesh state.
- `POST /send` sends fire-and-forget bytes to a destination peer ID.
- `GET /recv` polls general inbound messages.
- `POST /mcp/{peer_id}/{service}` sends JSON-RPC to a remote MCP service.
- `POST /a2a/{peer_id}` sends JSON-RPC to a remote A2A server.

### OpenTool Mesh adapter target

Preferred first implementation:

1. Keep the tool node's existing `/invokeTool` behavior.
2. Add a small local MCP bridge service that exposes the tool as an MCP service and forwards calls to `/invokeTool`.
3. Configure AXL `router_addr` / `router_port` to point at that MCP bridge.
4. Add `createGensynAxlInvocationTransport()` that calls `POST /mcp/{peer_id}/{service}`.
5. Treat `manifest.invocation.axlPeerId` as the AXL peer ID.
6. Add an explicit service field before production use. The current `axlMethod` can continue to map to the JSON-RPC method or tool method during the transition, but the manifest will be clearer if it eventually separates `axlService` from `axlMethod`.

Fallback implementation:

- Use `/send` and `/recv` with the current `otm.tool.invoke` envelope. This preserves the local envelope but forces OpenTool Mesh to build request-response correlation and timeout handling itself.

## ENS

### What the docs imply

ENS text records are arbitrary key-value pairs associated with a name. Custom records are supported, and ENS recommends using a project or protocol prefix to avoid collisions. The public resolver interface exposes `text(bytes32 node, string key)` and `setText(bytes32 node, string key, string value)`.

This maps directly to the existing local records:

```text
opentoolmesh.manifest_uri
opentoolmesh.manifest_hash
opentoolmesh.owner
opentoolmesh.latest_version
opentoolmesh.capabilities
```

### Setup notes

Operational requirements:

- A controlled ENS name or subname for each published tool.
- A resolver that supports text records.
- A wallet allowed to update records for the name.
- An Ethereum RPC endpoint for reads and writes.

Recommended environment shape:

```sh
OTM_ENS_PROVIDER=ens
OTM_ENS_RPC_URL=https://...
OTM_ENS_NAME=solidity-scanner.example.eth
OTM_ENS_PUBLISHER_PRIVATE_KEY=...
```

Read path:

- Normalize the ENS name before reads.
- Read the custom text records listed above.
- Resolve the owner from the registry or resolver-backed ownership path selected by the implementation.
- Keep the existing `ToolIdentity` shape.

Write path:

- Publish the manifest first so the manifest URI and hash are final.
- Use resolver `setText` calls, preferably batched when the resolver supports multicall.
- Update `opentoolmesh.latest_version` last so consumers do not see a new version before the pointer and hash are available.

Testnet name setup:

- Use Sepolia for ENS testing. ENS documents Holesky support as being phased out.
- Register through `https://sepolia.app.ens.domains/` with a wallet that has Sepolia ETH.
- Registration follows the ENS commit/reveal flow: commit, wait at least 60 seconds, then register within the valid reveal window.
- Use the resulting Sepolia name in `OTM_ENS_NAME`, and use a Sepolia RPC in `OTM_ENS_RPC_URL`.

Relevant Sepolia deployments:

| Contract | Address |
| --- | --- |
| Registry | `0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e` |
| ETH Registrar Controller | `0xfb3cE5D01e0f33f41DbB39035dB9745962F1f968` |
| Name Wrapper | `0x0635513f179D50A207757E05759CbD106d7dFcE8` |
| Public Resolver | `0xE99638b40E4Fff0129D56f03b55b6bbC4BBE49b5` |
| Universal Resolver | `0xeEeEEEeE14D718C2B47D9923Deab1335E144EeEe` |

## 0G Storage and 0G KV

### What the docs imply

0G Storage provides Go and TypeScript SDKs for file upload and download. The TypeScript SDK supports `@0gfoundation/0g-ts-sdk` with `ethers`, an EVM RPC URL, and an indexer RPC URL. It also exposes KV operations for stream-based key-value data.

This maps to two OpenTool Mesh adapters:

- `BlobStorageAdapter`: manifests, traces, reports, and artifacts.
- `KvIndexAdapter`: capability indexes and trace summaries.

### Setup notes

Recommended environment shape:

```sh
OTM_STORAGE_PROVIDER=0g
OTM_0G_RPC_URL=https://evmrpc-testnet.0g.ai
OTM_0G_INDEXER_RPC=https://indexer-storage-testnet-turbo.0g.ai
OTM_0G_PRIVATE_KEY=...
OTM_0G_KV_NODE_URL=https://your-0g-kv-node
OTM_0G_KV_STREAM_ID=0x...
```

`OTM_0G_RPC_URL` is the EVM chain RPC. It is not a 0G KV node URL. The 0G TypeScript SDK reads KV data through `KvClient(kvNodeUrl)` and the official example currently shows `http://3.101.147.150:6789`. That example endpoint is not stable enough to treat as product infrastructure; during local verification it timed out. For reliable live use, configure a provider-maintained KV node URL or run a controlled 0G KV/storage node and keep the URL in `OTM_0G_KV_NODE_URL`.

Testnet token setup:

- 0G Galileo testnet uses chain ID `16602`, token symbol `0G`, and development EVM RPC `https://evmrpc-testnet.0g.ai`.
- Get test 0G from the official faucet `https://faucet.0g.ai` or Google Cloud faucet `https://cloud.google.com/application/web3/faucet/0g/galileo`.
- 0G documents a daily faucet limit of `0.1 0G` per wallet; larger requests should go through their Discord community.

`OTM_0G_KV_STREAM_ID` is not another endpoint. It is the stream namespace passed into 0G KV write/read calls. Use one stable 32-byte hex stream ID per environment and keep reusing it for all reads/writes in that environment. When running your own KV node, add the same stream to the node `stream_ids` list so the node monitors and replays that namespace; the KV node example config lists stream IDs without the `0x` prefix, while the TypeScript SDK call uses the `0x`-prefixed form. To create a new namespace locally:

```sh
node -e "const crypto=require('node:crypto'); console.log('0x'+crypto.randomBytes(32).toString('hex'))"
```

Blob storage flow:

1. Serialize JSON to bytes.
2. Upload with the 0G TypeScript SDK.
3. Persist the returned root hash and transaction hash.
4. Return an OpenTool Mesh URI such as `0g://root/<rootHash>`.
5. Download by root hash with proof verification enabled for sensitive artifacts.

KV flow:

1. Map existing keys directly, such as `capability:solidity-static-analysis` and `trace:<traceId>`.
2. Encode keys and values as bytes for the selected 0G KV stream.
3. Use a stable stream ID per environment.
4. Keep local KV available for tests and offline demos.

Design note: 0G Storage documentation distinguishes Turbo and Standard modes. The adapter should treat endpoint selection as configuration, not hard-coded behavior.

Self-hosting note: when no stable provider-maintained KV endpoint is available, run a 0G KV node and point `OTM_0G_KV_NODE_URL` at its HTTP RPC listener. The operational steps are recorded in [0G KV Node Runbook](../operations/0g-kv-node-runbook.md).

## Provider Profile Design

Add provider-backed dependencies through a profile factory instead of changing callers:

```ts
createOpenToolMeshClient(createProviderDeps({
  profile: process.env.OTM_PROVIDER_PROFILE ?? "local"
}));
```

Recommended profiles:

| Profile | ENS | Blob | KV | Transport |
| --- | --- | --- | --- | --- |
| `local` | Local JSON file | Local filesystem | Local filesystem | Local HTTP peer map |
| `provider-testnet` | ENS-compatible test deployment or controlled test name | 0G testnet | 0G KV test stream or local fallback | Gensyn AXL test mesh |
| `provider-mainnet` | Production ENS name | 0G mainnet | 0G KV production stream | Gensyn AXL production mesh |

Keep tests on `local`. Add separate provider smoke scripts for live credentials.

### No-network test coverage

Provider integration tests should keep live credentials and network access out of the default test suite. The current SDK coverage in `packages/sdk/tests/provider-integration.test.ts` locks down the seams that real adapters must preserve:

- Local profile path parsing still resolves all state under `.opentoolmesh/`.
- Provider profile environment parsing trims values, validates provider selectors and hex keys, and fails before any network call when required configuration is missing or malformed.
- The `local` provider profile still builds a client that can publish and resolve a manifest.
- The AXL-style invocation transport trims registered peer URLs, posts JSON to the selected method path, and forwards the exact request body.
- Transport failures are surfaced for missing peers and non-2xx fetch responses.

Live ENS, 0G, or Gensyn AXL smoke tests should be opt-in scripts with explicit endpoint and credential checks. They should not replace these deterministic tests.

## Current Implementation Status

The SDK now has an opt-in provider profile path:

- `createProviderConfigFromEnv()` parses `OTM_PROVIDER_PROFILE`.
- `createProviderClientDeps()` maps `local` to the existing local devnet and maps provider profiles to ENS, 0G, and Gensyn AXL adapters.
- CLI commands and the audit-agent example use the provider profile factory by default.
- `publishManifest()` writes the capability index through the configured KV adapter, so provider-backed publish can update 0G KV without a local-only seed step.
- The sample tool node exposes an AXL-compatible MCP bridge at `POST /mcp/{peer}/{service}` while preserving the existing `/health` and `/invokeTool` routes.
- `scripts/provider-live-smoke.ts --full` now exercises the full provider acceptance path: publish, discover, resolve, load 0G manifest, verify, AXL invoke, save request/response/output/report artifacts, record the 0G trace, and mirror the run for dashboard display.

Provider profiles are live-code integration points, but real network execution still requires credentials, endpoints, and optional runtime packages:

- ENS adapter: install `viem`.
- ENS write support: install `viem/accounts` and provide `OTM_ENS_PUBLISHER_PRIVATE_KEY`.
- 0G adapters: install `@0gfoundation/0g-ts-sdk` or compatible `@0glabs/0g-ts-sdk`, plus `ethers`.
- Gensyn AXL adapter: run an AXL node with its local HTTP API reachable by `OTM_GENSYN_AXL_API_URL`, or point that variable at the local tool-node MCP bridge for bridge-only smoke tests.

Implementation caveat: the current manifest schema still carries a self-referential `storage.manifestUri`. Local storage can overwrite the same manifest path, but immutable 0G roots cannot. The provider publish path stores the second manifest root as the resolved URI while preserving the existing hash rule. A future manifest schema revision should remove the self-reference from the hashed manifest body.

## Remaining Implementation Order

1. Run a testnet publish smoke: upload manifest to 0G, write ENS text records, and confirm `resolve` loads the same manifest through provider adapters.
2. Run a testnet invocation smoke through Gensyn AXL.
3. Revise the manifest schema to remove self-referential URI hashing before treating 0G roots as production evidence.

## Live Provider Smoke Script

The provider smoke is opt-in and reads local credentials from `.env.provider`, which is gitignored. It validates configuration before any provider call, then runs:

```text
publish -> resolve -> verify -> optional call
```

Run the non-invocation smoke:

```sh
corepack pnpm provider:smoke
```

Run the full smoke including Gensyn AXL invocation:

```sh
corepack pnpm provider:smoke -- --call
```

The script uses the existing SDK build output when present. If SDK dist is missing, it builds only `@opentoolmesh/sdk` before running. It does not require a full repo build.

Create `.env.provider` locally from [`.env.provider.example`](../../.env.provider.example) with real testnet values:

```sh
OTM_PROVIDER_PROFILE=provider-testnet
OTM_ENS_PROVIDER=ens
OTM_ENS_RPC_URL=https://your-ethereum-testnet-rpc
OTM_ENS_NAME=your-tool-name.example.eth
OTM_ENS_PUBLISHER_PRIVATE_KEY=0x0000000000000000000000000000000000000000000000000000000000000000

OTM_STORAGE_PROVIDER=0g
OTM_0G_RPC_URL=https://evmrpc-testnet.0g.ai
OTM_0G_INDEXER_RPC=https://indexer-storage-testnet-turbo.0g.ai
OTM_0G_PRIVATE_KEY=0x0000000000000000000000000000000000000000000000000000000000000000
OTM_0G_KV_NODE_URL=https://your-0g-kv-node
OTM_0G_KV_STREAM_ID=0xreplace_with_32_byte_stream_id

OTM_GENSYN_AXL_API_URL=http://127.0.0.1:9002
```

Replace every placeholder before running. The smoke treats placeholder-looking values and repeated-digit private keys as invalid, so missing real credentials fail fast with a clear environment error instead of making partial provider writes.

For a local bridge-only invocation check, start the tool node and set:

```sh
OTM_GENSYN_AXL_API_URL=http://127.0.0.1:4318
```

That exercises the OpenTool Mesh MCP bridge route without proving connectivity through a real Gensyn AXL mesh node. A true AXL smoke should use the AXL node API endpoint, normally `http://127.0.0.1:9002`.

Optional variables:

- `OTM_TOOL_OWNER_ADDRESS`: overrides the manifest owner address before publishing.
- `OTM_PROVIDER_SMOKE_CALL=true`: same as passing `--call`.

Optional flags:

- `--env <path>`: use a different env file.
- `--manifest <path>`: publish a different manifest file.
- `--input <path>`: use a different call input JSON containing `source` or `sourceFile`.
- `--sdk-version <version>`: override the verify step SDK version.

## Acceptance Criteria

Provider-backed MVP is acceptable when:

- `publish` stores the manifest in 0G and writes the final URI/hash/version to ENS records.
- `discover` can resolve a capability from 0G KV or a documented provider-backed discovery fallback.
- `resolve` reads the same manifest pointer and hash from ENS that `publish` wrote.
- `verify` recomputes the manifest hash and matches the ENS record.
- `call` reaches a remote tool peer through AXL, not through the local peer map.
- `trace` and report artifacts are stored in 0G and their roots are visible in the dashboard or CLI output.
- Local demos and tests still pass with `OTM_PROVIDER_PROFILE=local`.

## Open Questions

- Which ENS name or subname will be used for the first live tool?
- Should capability discovery require 0G KV in the first live milestone, or can the first milestone keep discovery local while identity, storage, and invocation move to providers?
- Should the manifest schema add `invocation.axlService` now, or should `axlMethod` temporarily encode the AXL MCP service?
- Which AXL public peer or private mesh will be used for the demo?
- Should Gensyn protocol integration remain a future reputation/evaluation layer, or is there a concrete Gensyn on-chain action needed for the hackathon demo?

## Sources

- Gensyn docs: https://docs.gensyn.ai/
- Gensyn network docs: https://docs.gensyn.network/
- Gensyn AXL page: https://www.gensyn.ai/axl
- Gensyn AXL repository and docs: https://github.com/gensyn-ai/axl
- ENS text records: https://docs.ens.domains/web/records/
- ENS resolver interface reference: https://docs.ens.domains/resolvers/interfaces/
- 0G Storage SDK: https://docs.0g.ai/developer-hub/building-on-0g/storage/sdk
