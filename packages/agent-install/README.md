# Agent Install Templates for OpenTool Mesh

This package generates install snippets for agent hosts that can launch or connect to the OpenTool Mesh MCP server.

Generate every supported template:

```sh
opentoolmesh-agent-install --all
```

Write templates to a directory:

```sh
opentoolmesh-agent-install --all --output-dir .opentoolmesh-agent-install
```

Generate a remote MCP registration instead of a local `stdio` command:

```sh
opentoolmesh-agent-install --target codex --remote-url https://example.com/mcp
```

Supported targets:

- Codex
- Claude Code
- Cursor
- Docker
- OpenClaw
- Hermes
