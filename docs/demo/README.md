# Demo Docs

This directory explains how to run OpenTool Mesh for real. It assumes you have installed dependencies from the repository root, or have at least read the quick start in the [repository README](../../README.md).

## What These Docs Answer

- Which command runs the full demo loop.
- What order to use for dashboard, tool node, publish, and audit-agent steps when presenting the demo manually.
- Which output fields and runtime files indicate success.
- How these demo docs relate to the `examples/audit-agent` code.

## Reading Order

1. [Demo Runbook](./opentool-mesh-demo-runbook.md)  
   Use this for a first full run. It covers one-command execution, step-by-step execution, dashboard alignment rules, and closed-loop checks.
2. [Preflight script](./demo-prereflight.sh)  
   Use this before running the demo to check key files, Node.js version, and build-output status.
3. [Health-check script](./demo-health-check.sh)  
   Use this after dashboard and tool node startup to confirm the services are alive.
4. [Runtime product inventory and health-check scope](./opentool-mesh-demo-runbook.md#56-runtime-product-inventory-and-health-check-scope)  
   Use this when `/opt/wanman/products.json` is missing or when you need the repository-level source of truth for product health.
5. [Audit Agent Example](../../examples/audit-agent/README.md)  
   Use this to understand what the example agent actually does.

## Shortest Run Path

```bash
corepack pnpm install
corepack pnpm demo:run
```

If you prefer a step-by-step presentation:

```bash
corepack pnpm dashboard:dev
corepack pnpm demo:tool-node
corepack pnpm demo:publish
corepack pnpm demo:audit-agent
corepack pnpm demo:health
```

## Relationship to the Main System

`docs/demo` explains how to run the system. `examples/audit-agent` shows how an agent consumes the capability. `apps/dashboard` shows how to review the evidence chain after a run. Together they represent the main invocation loop rather than three unrelated demos.
