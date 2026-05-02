# Audit Agent Example

`examples/audit-agent` is a reference consumer. It demonstrates how an agent uses OpenTool Mesh discovery, verification, invocation, trace, and reporting capabilities. It is not the SDK core and it is not a production audit system; it is the smallest runnable consumer for the main system loop.

## Purpose

This example answers four questions:

1. How an agent discovers tools by capability.
2. How it resolves identity and loads a manifest after discovery.
3. How it verifies the manifest before invocation.
4. How it generates a trace and audit report after invocation.

## How to Run

Run from the repository root:

```bash
corepack pnpm --filter @opentoolmesh/audit-agent-example build
corepack pnpm --filter @opentoolmesh/audit-agent-example start
```

To let the script prepare the tool node, publish step, and seed data automatically:

```bash
corepack pnpm demo:run
```

To test only this package:

```bash
corepack pnpm --filter @opentoolmesh/audit-agent-example test
```

## Input and Output

Default input:

- Contract source: `fixtures/sample-contract.sol`
- Target capability: `solidity-static-analysis`

The run generates or references:

- Published manifest
- Capability index entry
- Invocation trace
- Tool-output artifact
- Audit report

Successful command output includes:

- `manifestUri`
- `traceId`
- `traceUri`
- `reportUri`

## Key Files

| Path | Purpose |
| --- | --- |
| `src/run-audit.ts` | Main example entrypoint wiring discover, resolve, verify, invoke, trace, and report. |
| `src/capabilities/required-capabilities.ts` | Declares the capability required by the example. |
| `src/report/build-report.ts` | Scaffold for report construction. |
| `fixtures/` | Baseline input data and dashboard fallback data. |
| `tests/run-audit.test.ts` | Verifies trace semantics and key fields. |

## When to Use

Use this example for:

- Understanding the shortest main-system invocation chain.
- Locating the agent-side integration entrypoint.
- Demonstrating where dashboard data and runtime traces come from.

Do not use this example as:

- A complete audit framework.
- A representation of production security-scanning depth.

## Relationship to the Main System

- It consumes the client API from `packages/sdk`.
- It depends on a published tool manifest and capability index.
- It invokes the remote execution endpoint exposed by `services/tool-node`.
- Its trace and report are read first by `apps/dashboard`.

Recommended reading order:

1. [Root README](../../README.md)
2. [Glossary and Command Quick Reference](../../docs/reference/glossary-and-command-quick-reference.md)
3. `src/run-audit.ts`
