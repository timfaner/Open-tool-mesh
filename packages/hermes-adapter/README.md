# Hermes Adapter for OpenTool Mesh

This package is skill-first for Hermes. It includes:

- `skills/opentool-mesh/SKILL.md`
- `opentoolmesh-hermes-call`, a small command that runs the Solidity scanner capability through OpenTool Mesh

Install command:

```sh
hermes skills install @opentoolmesh/hermes-adapter/opentool-mesh
```

When Hermes has MCP enabled, configure the server as:

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

Hermes registers the server tools with the configured server name. For `opentoolmesh`, the native names are:

```text
mcp_opentoolmesh_opentoolmesh_publish_tool
mcp_opentoolmesh_opentoolmesh_discover_tools
mcp_opentoolmesh_opentoolmesh_resolve_tool
mcp_opentoolmesh_opentoolmesh_verify_tool
mcp_opentoolmesh_opentoolmesh_get_trace
mcp_opentoolmesh_opentoolmesh_call_capability
mcp_opentoolmesh_opentoolmesh_solidity_static_analysis
```

The fallback command remains available for terminal-only Solidity scanner calls:

```sh
opentoolmesh-hermes-call examples/audit-agent/fixtures/sample-contract.sol
```
