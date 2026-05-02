# Getting Started with OpenTool Mesh

These docs are for developers opening the repository for the first time. The goal is to complete environment setup, dependency installation, tests, dashboard startup, and basic troubleshooting in about 10 to 15 minutes.

## What You Will Accomplish

- Confirm that local Node.js, `corepack`, and the repository directory meet the requirements.
- Install workspace dependencies from the repository root.
- Run workspace tests to verify the codebase is usable.
- Start the dashboard by itself and know how to check service readiness.
- Jump directly to troubleshooting docs for common startup failures.

## Recommended Reading Order

1. Read [Quick Start](./quickstart.md) and follow it in order for the first run.
2. If an environment or command issue appears, open [Troubleshooting](./troubleshooting.md).
3. When you want the complete runtime loop, use [Glossary and Command Quick Reference](../reference/glossary-and-command-quick-reference.md).
4. To understand why the system is organized this way, read [Architecture Docs](../architecture/README.md), then [System Overview](../architecture/system-overview.md). Do not treat older planning drafts as the default entrypoint.

## Document Roles

### [Quick Start](./quickstart.md)

Covers the shortest first-run path: environment checks, dependency installation, tests, dashboard startup, success signals, and next reading steps.

### [Troubleshooting](./troubleshooting.md)

Covers common startup problems such as `vitest: not found`, `tsc: not found`, old Node.js versions, occupied dashboard ports, and missing latest runtime data in the dashboard.

## Next Steps

- To run the complete loop, use `corepack pnpm demo:run` and [Glossary and Command Quick Reference](../reference/glossary-and-command-quick-reference.md).
- To understand how the example agent consumes the system, read [Audit Agent Example](../../examples/audit-agent/README.md).
- To understand the CLI, SDK, tool node, and dashboard relationship, start with [Architecture Docs](../architecture/README.md), then follow the recommended path to [System Overview](../architecture/system-overview.md).
