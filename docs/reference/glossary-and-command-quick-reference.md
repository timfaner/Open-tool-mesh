# Glossary and Command Quick Reference

Use this page to align on the core vocabulary and the shortest command choices in OpenTool Mesh.

## The Core Loop

```text
publish -> discover -> resolve -> verify -> call -> trace -> report
```

The MVP demonstrates this loop with one Solidity static-analysis tool and one reference audit agent.

## Core Glossary

### `manifest`

A JSON document that describes a tool identity, owner, capabilities, MCP-compatible tool schema, invocation metadata, storage pointer, compatibility fields, and integrity hash.

### `trace`

A persisted record of one invocation path. It links the selected tool, discovery result, verification checks, invocation envelope, input/output summary, artifacts, and storage metadata.

### `tool node`

The remote execution service. In the MVP it is a local HTTP service under `services/tool-node` exposing `/health` and `/invokeTool`.

### `capability index`

A local KV-style index mapping capability names, such as `solidity-static-analysis`, to candidate tool identities.

### `audit report`

A report artifact generated after invocation. It references the trace and summarizes findings from the tool output.

### `tool identity`

The ENS-style identity record for a tool. It points to the manifest and owner root used during verification.

### `artifact`

A persisted runtime output such as tool output or an audit report.

## How These Terms Relate

- A manifest describes what a tool is and how to call it.
- The capability index helps an agent find candidate tool identities.
- Identity resolution links a tool identity to the latest manifest pointer.
- Verification checks whether the manifest is trustworthy for this MVP.
- Invocation produces output through the tool node.
- Trace and report artifacts make the run reviewable.

## Command Quick Reference

### Environment and Demo

```bash
corepack enable
corepack pnpm install
corepack pnpm test
corepack pnpm demo:run
```

### `publish`

Use when you need to publish the sample manifest into local runtime storage and update the capability index:

```bash
corepack pnpm demo:publish
```

### `discover`

Use when you need to prove a capability can resolve to a candidate tool:

```bash
corepack pnpm opentool discover solidity-static-analysis
```

### `verify`

Use when you need to validate a manifest and identity binding:

```bash
corepack pnpm opentool verify solidity-pattern-scanner.opentool.eth
```

### `call`

Use when you need the CLI to run the invocation path:

```bash
corepack pnpm opentool call solidity-static-analysis
```

### Tool Node and Dashboard

```bash
corepack pnpm demo:tool-node
corepack pnpm dashboard:dev
corepack pnpm demo:health
```

## Shortest Command Decision Guide

- First setup: `corepack pnpm install`
- Validate repository health: `corepack pnpm test`
- Run everything: `corepack pnpm demo:run`
- Present services separately: `dashboard:dev`, `demo:tool-node`, `demo:publish`, `demo:audit-agent`
- Check services: `corepack pnpm demo:health`

## Read Next

- [Getting Started](../getting-started/README.md)
- [Demo Runbook](../demo/opentool-mesh-demo-runbook.md)
- [Architecture Docs](../architecture/README.md)
