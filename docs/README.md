# Documentation

This page is the top-level index for `docs/`. It helps first-time readers move through the documentation in a useful order instead of jumping between directories.

## Recommended Reading Order

If you are new to the project, read in this order:

1. Return to the [repository README](../README.md) to confirm the project purpose, requirements, and shortest startup commands.
2. Read [Getting Started](./getting-started/README.md) to prepare the environment, install dependencies, run tests, and start the dashboard.
3. Read [Demo Docs](./demo/README.md) to run the `publish -> discover -> verify -> call -> trace -> report` loop.
4. Read [Architecture Docs](./architecture/) to understand the actual boundaries between the CLI, SDK, tool node, example agent, and dashboard.
5. Read [Integration Guides](./integration/README.md) when publishing a tool or connecting an agent.
6. Read [Real Provider Integration Notes](./architecture/real-provider-integration.md) when planning ENS, 0G, or Gensyn AXL integration.
7. Use [Operations Runbooks](./operations/real-provider-mvp-runbook.md) when setting up live provider infrastructure such as ENS, 0G, and the local AXL bridge.
8. Use [Reference Docs](./reference/README.md) when you need terminology or command reminders.
9. Read [Product Scope](./product/product-scope-and-acceptance.md) for the project narrative, MVP boundary, and acceptance criteria.

## Entry Points by Reader Type

### I Want to Run the Project First

Start with:

- [Demo Docs](./demo/README.md)
- [Demo Runbook](./demo/opentool-mesh-demo-runbook.md)
- [Audit Agent Example](../examples/audit-agent/README.md)

This path is for readers who want to prove the repository runs before studying implementation details.

### I Want to Understand the System

Start with:

- [Architecture Directory](./architecture/)
- [Architecture Docs](./architecture/README.md)
- [System Overview](./architecture/system-overview.md)
- [Module Boundaries](./architecture/module-boundaries.md)
- [Runtime Lifecycle](./architecture/runtime-lifecycle.md)
- [Real Provider Integration Notes](./architecture/real-provider-integration.md)

This path is for contributors, maintainers, and readers building a code map.

### I Want to Integrate a Tool or Agent

Start with:

- [Integration Guides](./integration/README.md)
- [Tool Provider Guide](./integration/tool-provider-guide.md)
- [Agent Integration Guide](./integration/agent-integration-guide.md)
- [Real Provider MVP Runbook](./operations/real-provider-mvp-runbook.md)

This path is for providers publishing tools and agents consuming OpenTool Mesh capabilities against ENS, 0G, and AXL-backed infrastructure.

### I Want Scope and Product Context

Start with:

- [Product Scope and Acceptance](./product/product-scope-and-acceptance.md)
- [Repository README](../README.md)

This path is for readers judging project value, hackathon scope, and explicit non-goals.

## What Each Directory Is For

| Path | Purpose |
| --- | --- |
| [`docs/getting-started/`](./getting-started/README.md) | First-run setup, dependency installation, tests, dashboard startup, and startup troubleshooting. |
| [`docs/demo/`](./demo/README.md) | How to run the demo, perform preflight checks, and confirm dashboard and tool-node health. |
| [`docs/architecture/`](./architecture/) | System boundaries, module responsibilities, key schemas, and the real invocation chain. |
| [`docs/architecture/real-provider-integration.md`](./architecture/real-provider-integration.md) | Provider research and design path for ENS, 0G, and Gensyn AXL integration. |
| [`docs/integration/`](./integration/README.md) | Tool provider and agent integration guides. |
| [`docs/operations/real-provider-mvp-runbook.md`](./operations/real-provider-mvp-runbook.md) | End-to-end runbook for running the MVP against real provider services. |
| [`docs/operations/0g-kv-node-runbook.md`](./operations/0g-kv-node-runbook.md) | Runbook for self-hosting the 0G KV node used by provider-backed KV discovery. |
| [`docs/reference/`](./reference/README.md) | Glossary, command quick reference, and short operational notes. |
| [`docs/product/`](./product/product-scope-and-acceptance.md) | Product positioning, target users, narrative boundary, and MVP acceptance scope. |

## Core Document Links

- [Getting Started](./getting-started/README.md)
- [Quick Start](./getting-started/quickstart.md)
- [Troubleshooting](./getting-started/troubleshooting.md)
- [Contributing Guide](../CONTRIBUTING.md)
- [Demo Docs](./demo/README.md)
- [Demo Runbook](./demo/opentool-mesh-demo-runbook.md)
- [Reference Docs](./reference/README.md)
- [Glossary and Command Quick Reference](./reference/glossary-and-command-quick-reference.md)
- [Integration Guides](./integration/README.md)
- [Tool Provider Guide](./integration/tool-provider-guide.md)
- [Agent Integration Guide](./integration/agent-integration-guide.md)
- [Architecture Directory](./architecture/)
- [Architecture Docs](./architecture/README.md)
- [Real Provider Integration Notes](./architecture/real-provider-integration.md)
- [Real Provider MVP Runbook](./operations/real-provider-mvp-runbook.md)
- [0G KV Node Runbook](./operations/0g-kv-node-runbook.md)
- [Product Scope and Acceptance](./product/product-scope-and-acceptance.md)
- [Audit Agent Example](../examples/audit-agent/README.md)

## Where to Go Next

If you have not run the project, start with [Getting Started](./getting-started/README.md).

If you have completed quick start and the demo, read the [Architecture Directory](./architecture/) for system boundaries and the invocation chain.

If you are judging whether the project matches its intended scope, read [Product Scope and Acceptance](./product/product-scope-and-acceptance.md).

If you plan to submit documentation or code changes, read [Contributing Guide](../CONTRIBUTING.md).
