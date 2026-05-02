---
name: opentool-mesh
description: Use when an OpenClaw agent needs to publish, discover, verify, call, or inspect OpenTool Mesh tools through MCP or direct plugin tools.
---

# OpenTool Mesh

Use the OpenTool Mesh tools when the task needs tool publishing, capability discovery, identity resolution, manifest verification, remote invocation, and trace persistence.

## Tools

- `opentoolmesh_publish_tool`: publish a `ToolManifest` from `manifestPath` or inline `manifest`.
- `opentoolmesh_discover_tools`: discover available tools for a `capability`.
- `opentoolmesh_resolve_tool`: resolve an ENS-style tool identity by `ensName`.
- `opentoolmesh_verify_tool`: load and verify the selected tool manifest.
- `opentoolmesh_get_trace`: load a persisted execution trace by `traceUri` or `traceId`.
- `opentoolmesh_call_capability`: generic capability call. Provide `capability` and `input`.
- `opentoolmesh_solidity_static_analysis`: shortcut for the `solidity-static-analysis` capability. Provide Solidity `source`.

## Required Behavior

1. Use `opentoolmesh_publish_tool` when the user wants to publish a manifest.
2. Use `opentoolmesh_discover_tools`, `opentoolmesh_resolve_tool`, and `opentoolmesh_verify_tool` when the user asks to find or inspect tools.
3. Prefer `opentoolmesh_solidity_static_analysis` for Solidity scanner work.
4. Use `opentoolmesh_call_capability` only when the user names another OpenTool Mesh capability.
5. Use `opentoolmesh_get_trace` after a call when the user asks for evidence, provenance, or a trace lookup.
6. Treat `verification.ok=false` or any tool-call error as a blocker.
7. Surface `traceUri`, `manifestUri`, and `toolId` in the final answer when a call succeeds.

## Local Runtime

The default local install runs the MCP server with:

```sh
npx -y @opentoolmesh/mcp-server --transport stdio
```

For provider-backed runs, set the same `OTM_PROVIDER_PROFILE` and provider environment variables used by the OpenTool Mesh runbook before launching OpenClaw.
