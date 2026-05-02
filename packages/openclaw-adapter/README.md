# OpenClaw Adapter for OpenTool Mesh

This package gives OpenClaw two integration paths:

- plugin tools that call OpenTool Mesh directly from JavaScript
- an MCP server registration that launches `@opentoolmesh/mcp-server`

Install command:

```sh
openclaw plugins install @opentoolmesh/openclaw-adapter
```

The plugin exposes:

- `opentoolmesh_call_capability`
- `opentoolmesh_publish_tool`
- `opentoolmesh_discover_tools`
- `opentoolmesh_resolve_tool`
- `opentoolmesh_verify_tool`
- `opentoolmesh_get_trace`
- `opentoolmesh_solidity_static_analysis`

The invocation tools preserve the OpenTool Mesh lifecycle: discover, resolve, verify, invoke, persist trace. The management tools expose the same lifecycle steps individually so an agent can publish manifests, search by capability, inspect identities, verify before use, and retrieve prior traces.
