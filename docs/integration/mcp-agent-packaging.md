# MCP Agent Packaging

This guide explains how OpenTool Mesh is packaged for agent hosts that support MCP, OpenClaw plugins, or Hermes skills.

## Deliverables

| Package | Purpose |
| --- | --- |
| `@opentoolmesh/mcp-server` | Core MCP server. Exposes OpenTool Mesh capabilities as MCP tools over `stdio` or HTTP. |
| `@opentoolmesh/agent-install` | Install template generator for Codex, Claude Code, Cursor, Docker, OpenClaw, and Hermes. |
| `@opentoolmesh/openclaw-adapter` | OpenClaw plugin metadata, direct tool registration helpers, and OpenClaw skill text. |
| `@opentoolmesh/hermes-adapter` | Hermes skill metadata and a small fallback command for Solidity scanner calls. |

## Core MCP Server

Build the MCP package:

```sh
corepack pnpm --filter @opentoolmesh/mcp-server build
```

Run it as a local `stdio` MCP server:

```sh
corepack pnpm mcp:stdio
```

Run it as an HTTP MCP server:

```sh
corepack pnpm mcp:http
```

The server exposes these tools:

- `opentoolmesh_call_capability`: generic capability invocation.
- `opentoolmesh_publish_tool`: publish a `ToolManifest` from `manifestPath` or inline `manifest`.
- `opentoolmesh_discover_tools`: discover tools by capability.
- `opentoolmesh_resolve_tool`: resolve an ENS-style tool identity and text records.
- `opentoolmesh_verify_tool`: resolve, load, and verify a tool manifest.
- `opentoolmesh_get_trace`: load a persisted execution trace by `traceUri` or `traceId`.
- `opentoolmesh_solidity_static_analysis`: shortcut for `solidity-static-analysis`.

The invocation tools preserve the OpenTool Mesh lifecycle:

```text
MCP tools/call -> discover -> resolve -> loadManifest -> verifyManifest -> invokeTool -> recordTrace
```

The management tools expose the surrounding lifecycle directly:

```text
publish -> discover -> resolve -> verify -> call -> get_trace
```

The structured call result includes `status`, `tool`, `verification`, `traceId`, `traceUri`, `artifacts`, and the underlying invocation response. Publish returns `manifestUri`, `manifestHash`, `version`, and indexed capabilities. Discovery returns the matching tool identities. Resolve and verify return identity, manifest, and verification evidence. `get_trace` returns the persisted trace object.

## Install Templates

Build the template generator:

```sh
corepack pnpm --filter @opentoolmesh/agent-install build
```

Print every supported install template:

```sh
corepack pnpm agent:install:templates
```

Write templates to a directory:

```sh
node packages/agent-install/dist/src/cli.js --all --output-dir .opentoolmesh-agent-install
```

Generate a remote MCP registration:

```sh
node packages/agent-install/dist/src/cli.js --target codex --remote-url https://example.com/mcp
```

The local default uses:

```sh
npx -y @opentoolmesh/mcp-server --transport stdio
```

Use a remote `https://.../mcp` URL when publishing a hosted MCP endpoint.

## OpenClaw Adapter

Build the OpenClaw adapter:

```sh
corepack pnpm --filter @opentoolmesh/openclaw-adapter build
```

OpenClaw install command:

```sh
openclaw plugins install @opentoolmesh/openclaw-adapter
```

The adapter includes:

- `openclaw/plugin.json`
- `skills/opentool-mesh/SKILL.md`
- `registerOpenToolMeshOpenClawPlugin(runtime)`
- direct tool descriptors for every MCP tool listed above

Use direct plugin tools when OpenClaw supports local JavaScript plugin execution. Use the MCP server registration when OpenClaw is acting as a generic MCP client.

## Hermes Adapter

Build the Hermes adapter:

```sh
corepack pnpm --filter @opentoolmesh/hermes-adapter build
```

Hermes skill install command:

```sh
hermes skills install @opentoolmesh/hermes-adapter/opentool-mesh
```

The adapter includes:

- `skills/opentool-mesh/SKILL.md`
- `opentoolmesh-hermes-call`

Hermes should prefer native MCP tools when available. In the Docker profile used by this repository, add this to the mounted `agent_data/config.yaml`:

```yaml
mcp_servers:
  opentoolmesh:
    command: "node"
    args:
      - "/workspace/packages/mcp-server/dist/mcp-server/src/cli.js"
      - "--transport"
      - "stdio"
      - "--workspace-root"
      - "/workspace"
    env:
      OTM_PROVIDER_PROFILE: "local"
    timeout: 120
    connect_timeout: 60
```

With server name `opentoolmesh`, Hermes registers native MCP tools with the `mcp_opentoolmesh_` prefix:

```text
mcp_opentoolmesh_opentoolmesh_publish_tool
mcp_opentoolmesh_opentoolmesh_discover_tools
mcp_opentoolmesh_opentoolmesh_resolve_tool
mcp_opentoolmesh_opentoolmesh_verify_tool
mcp_opentoolmesh_opentoolmesh_get_trace
mcp_opentoolmesh_opentoolmesh_call_capability
mcp_opentoolmesh_opentoolmesh_solidity_static_analysis
```

The fallback command is for terminal-only skill execution:

```sh
opentoolmesh-hermes-call examples/audit-agent/fixtures/sample-contract.sol
```

## Runtime Expectations

For local invocation runs, the OpenTool Mesh local state must contain a published manifest, capability index, and AXL peer record. The fastest way to create all of that state is still:

```sh
corepack pnpm demo:run
```

For publish-only or discovery-only tests through MCP, call `opentoolmesh_publish_tool` with:

```json
{
  "manifestPath": "manifests/solidity-pattern-scanner.manifest.json"
}
```

Before invoking the local Solidity scanner, make sure the AXL peer registry points at the running tool node. The repository's `scripts/publish-tool.ts` helper does this for the demo peer.

For provider-backed runs, use the same environment described in the real-provider runbook:

```sh
OTM_PROVIDER_PROFILE=provider-testnet
```

and the required ENS, 0G, and AXL variables.

## Completion Checks

Before publishing an adapter package, run:

```sh
corepack pnpm --filter @opentoolmesh/mcp-server test
corepack pnpm --filter @opentoolmesh/agent-install test
corepack pnpm --filter @opentoolmesh/openclaw-adapter test
corepack pnpm --filter @opentoolmesh/hermes-adapter test
corepack pnpm typecheck
```
