# OpenTool Mesh

OpenTool Mesh is an open-source MVP for agent tool invocation. It connects tool publishing, capability discovery, manifest verification, remote invocation, trace persistence, and audit reporting into one reproducible loop.

This repository is most useful for two audiences:

- Developers who want to run a `publish -> discover -> verify -> call -> trace -> report` demo end to end.
- Contributors who want to understand how the CLI, SDK, tool node, example agent, and dashboard fit together.

## Why This Repo Exists

The goal is not to build a generic tool marketplace. The goal is to prove a working foundation for auditable remote tool calls:

1. Describe a tool with a manifest.
2. Discover tools through a capability index and ENS-style identity records.
3. Verify manifest integrity and identity binding before invocation.
4. Execute the request through a remote tool node.
5. Persist request, response, tool output, trace, and report evidence.
6. Replay the run through the dashboard.

## Quick Start

Run all commands from the repository root:

```bash
corepack enable
corepack pnpm install
corepack pnpm test
corepack pnpm demo:run
```

Prerequisites:

- Node.js 20 or newer
- `corepack`

Success signals:

- `corepack pnpm test` passes the workspace tests.
- `corepack pnpm demo:run` prints `manifestUri`, `traceId`, `traceUri`, and `reportUri`.
- A local `.opentoolmesh/` runtime directory is generated with traces, artifacts, reports, and manifests.

To check the environment before starting services:

```bash
corepack pnpm demo:preflight
```

For installation, testing, dashboard startup, and troubleshooting details, see [Getting Started](./docs/getting-started/README.md).

## Common Commands

```bash
corepack pnpm install
corepack pnpm build
corepack pnpm test
corepack pnpm demo:preflight
corepack pnpm demo:run
```

Start only the dashboard:

```bash
corepack pnpm dashboard:dev
```

Run service health checks:

```bash
corepack pnpm demo:health
```

## Repository Map

| Path | Purpose |
| --- | --- |
| `packages/shared` | Shared types and schema contracts. |
| `packages/sdk` | Runtime orchestration for discover, resolve, verify, invoke, and trace. |
| `packages/cli` | `opentool` CLI entrypoint. |
| `services/tool-node` | Remote tool execution service exposing `/health` and `/invokeTool`. |
| `examples/audit-agent` | Reference consumer showing how an agent uses remote capabilities. |
| `apps/dashboard` | Read-only dashboard for reviewing the latest demo run. |
| `docs/demo` | Demo runbook, preflight checks, and health checks. |
| `docs/architecture` | System overview, module boundaries, interfaces, and schema notes. |

## Reading Path

1. Start here to understand the project goal and fastest commands.
2. Read [Getting Started](./docs/getting-started/README.md) to prepare the environment, run tests, and launch the dashboard.
3. Read [Demo Docs](./docs/demo/README.md) when you want the full demo path.
4. Read [Architecture Docs](./docs/architecture/README.md) to understand system boundaries.
5. Read [Audit Agent Example](./examples/audit-agent/README.md) with `examples/audit-agent/src/run-audit.ts` to follow the real invocation chain.

## Documentation Index

- [Getting Started](./docs/getting-started/README.md)
- [Quick Start](./docs/getting-started/quickstart.md)
- [Troubleshooting](./docs/getting-started/troubleshooting.md)
- [Contributing Guide](./CONTRIBUTING.md)
- [Demo Docs](./docs/demo/README.md)
- [Glossary and Command Quick Reference](./docs/reference/glossary-and-command-quick-reference.md)
- [Demo Runbook](./docs/demo/opentool-mesh-demo-runbook.md)
- [Audit Agent Example](./examples/audit-agent/README.md)
- [Product Scope and Acceptance](./docs/product/product-scope-and-acceptance.md)
- [Architecture Docs](./docs/architecture/README.md)
- [System Overview](./docs/architecture/system-overview.md)
- [Module Interfaces](./docs/architecture/module-interfaces.md)
- [Real Provider MVP Runbook](./docs/operations/real-provider-mvp-runbook.md)
- [Reference Docs](./docs/reference/README.md)

## Architecture Navigation

The most important real paths in the current implementation are:

- Publish path: manifest JSON -> `demo:publish` -> local storage + ENS-style records + capability index.
- Invocation path: `discover -> resolve -> loadManifest -> verify -> invokeTool -> recordTrace -> buildAuditReport`.
- Display path: the dashboard reads the latest successful trace first, then falls back to fixtures when no runtime trace exists.

Code entrypoints:

- Agent: `examples/audit-agent/src/run-audit.ts`
- CLI: `packages/cli/src/index.ts`
- Tool node: `services/tool-node/src/server.ts`
- Dashboard data: `apps/dashboard/lib/demo-run.ts`

## Contributing

The best contribution paths right now are:

- Run the demo and check whether the README and docs are enough for first-time setup.
- Keep architecture docs aligned with the current code.
- Improve explanations and tests for the CLI, SDK, tool node, and dashboard.

Recommended flow:

```bash
git checkout -b your-branch-name
corepack pnpm install
corepack pnpm test
```

Before opening a PR, verify that documentation links work, commands run from the repository root, and any runtime-path change has a matching test or minimal demo check. Read [Contributing Guide](./CONTRIBUTING.md) before your first contribution.

## Troubleshooting

`vitest: not found` usually means dependencies have not been installed. Run `corepack pnpm install`, then rerun `corepack pnpm test`.

`tsc: not found` usually means workspace dependencies are missing before a build or demo command. Run `corepack pnpm install`, then retry `corepack pnpm build` or `corepack pnpm demo:run`.

For more startup issues, see [Troubleshooting](./docs/getting-started/troubleshooting.md).
