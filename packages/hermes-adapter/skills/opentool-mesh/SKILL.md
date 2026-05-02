---
name: opentool-mesh
description: Use when Hermes needs to publish, discover, verify, call, or inspect OpenTool Mesh tools through MCP or a local command.
---

# OpenTool Mesh

Use this skill when the user asks Hermes to publish a tool manifest, discover tools by capability, resolve or verify a tool identity, run a tool through OpenTool Mesh, inspect a Solidity contract with the OpenTool Mesh scanner, or produce a traceable tool-call record.

## Preferred Path

1. Use native MCP tools first when Hermes has the `opentoolmesh` MCP server configured.
2. Publish a manifest with `mcp_opentoolmesh_opentoolmesh_publish_tool`, passing `manifestPath` or `manifest`.
3. Discover, inspect, and prove a tool with `mcp_opentoolmesh_opentoolmesh_discover_tools`, `mcp_opentoolmesh_opentoolmesh_resolve_tool`, and `mcp_opentoolmesh_opentoolmesh_verify_tool`.
4. Call `mcp_opentoolmesh_opentoolmesh_solidity_static_analysis` for Solidity scanner work.
5. Use `mcp_opentoolmesh_opentoolmesh_call_capability` when the user names a different OpenTool Mesh capability.
6. Load a persisted trace with `mcp_opentoolmesh_opentoolmesh_get_trace` after a call returns `traceUri` or `traceId`.
7. When using another MCP client surface, use the same tool names without the `mcp_opentoolmesh_` prefix.
8. If an MCP client is not available, run:

```sh
opentoolmesh-hermes-call path/to/Contract.sol
```

In the Docker profile for this repository, if the command is not on `PATH`, run:

```sh
node /workspace/packages/hermes-adapter/dist/hermes-adapter/src/cli.js path/to/Contract.sol
```

## Output Contract

Always report:

- `status`
- `manifestUri` and `manifestHash` for publish operations
- discovered `count` and selected `ensName` for discovery operations
- `identity.id` and `identity.latestManifestUri` for resolve operations
- `verification.ok` and any verification errors
- `tool.toolId`
- `tool.manifestUri`
- `traceUri`
- important findings from `output`

If the call fails before invocation, report the verification or discovery error and do not invent results.

## Runtime

The default MCP server command is:

```sh
npx -y @opentoolmesh/mcp-server --transport stdio
```

Provider-backed runs use the same `OTM_PROVIDER_PROFILE`, ENS, 0G, and AXL environment variables as OpenTool Mesh itself.
