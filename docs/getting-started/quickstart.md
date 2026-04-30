# OpenTool Mesh Quick Start

This page covers the shortest path for a first run from a clean checkout.

## Who This Is For

Use this guide if you want to install dependencies, run tests, start the dashboard, and confirm service health before reading deeper architecture docs.

## Prerequisites

Required:

- Node.js 20 or newer
- `corepack`
- A checkout of this repository

Check versions:

```bash
node --version
corepack --version
```

All commands below assume the repository root as the current directory.

## Step 1: Install Dependencies

```bash
corepack enable
corepack pnpm install
```

Success signal:

- `node_modules/` exists.
- Workspace packages can resolve `vitest` and `tsc`.

If installation fails, see [Troubleshooting](./troubleshooting.md).

## Step 2: Run Tests

```bash
corepack pnpm test
```

Success signal:

- The workspace test command finishes without failures.

This verifies the shared packages, CLI behavior, SDK behavior, tool-node behavior, dashboard demo utilities, and audit-agent example tests covered by the current workspace.

## Step 3: Start the Dashboard

```bash
corepack pnpm dashboard:dev
```

The dashboard defaults to:

```text
http://127.0.0.1:3000/
```

If port `3000` is already in use, stop the existing process or run the dashboard on a different port according to the package script behavior.

## Step 4: Check Service Health

With the dashboard running, check:

```bash
curl -s http://127.0.0.1:3000/api/health
```

Expected result:

```json
{"ok":true}
```

For the complete demo health check, run:

```bash
corepack pnpm demo:health
```

## What To Do Next

- To run the full loop, use `corepack pnpm demo:run`.
- To present the demo step by step, read [Demo Runbook](../demo/opentool-mesh-demo-runbook.md).
- To understand the system, read [Architecture Docs](../architecture/README.md).

## Next Steps

Recommended next documents:

- [Troubleshooting](./troubleshooting.md)
- [Demo Docs](../demo/README.md)
- [System Overview](../architecture/system-overview.md)
