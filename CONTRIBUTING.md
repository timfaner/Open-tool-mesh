# Contributing Guide

This guide explains how to make small, reviewable contributions to OpenTool Mesh. The repository is an MVP, so contributions should keep the demo loop reliable and keep documentation aligned with real code paths.

## What to Know Before Contributing

OpenTool Mesh currently proves one loop:

```text
publish -> discover -> verify -> call -> trace -> report -> dashboard
```

The implementation uses local devnet adapters for ENS-style identity, 0G-style storage/KV, and AXL-style invocation semantics. Do not describe those local adapters as production decentralized integrations.

## Environment Setup

Prerequisites:

- Node.js 20 or newer
- `corepack`
- `pnpm` through Corepack

Recommended setup:

```bash
corepack enable
corepack pnpm install
corepack pnpm test
```

If dependencies are missing, commands such as `vitest`, `tsc`, or package builds may fail.

## Recommended Workflow

```bash
git checkout -b your-branch-name
corepack pnpm install

# Edit docs or code.

# Run the smallest useful validation.
corepack pnpm test
```

Keep pull requests focused. A documentation fix should not carry unrelated formatting churn, and a runtime fix should include validation evidence.

## Minimum Validation Before Submission

### Documentation Changes

For docs-only changes, check:

- Markdown links still point to existing files.
- Commands are meant to run from the repository root unless stated otherwise.
- Documentation does not claim behavior that the current code cannot prove.
- Any renamed document is updated in indexes and cross-links.

Useful checks:

```bash
rg -n "old-path-or-term" .
rg -n "[\\p{Han}]" -g "*.md"
```

### Code Changes

For code changes, run:

```bash
corepack pnpm test
```

If the change touches package boundaries or build output, also run:

```bash
corepack pnpm build
```

If the change touches the demo loop, run:

```bash
corepack pnpm demo:run
```

### When More Validation Is Needed

Run broader checks when a change affects:

- Shared schemas or runtime contracts.
- SDK client behavior.
- CLI command behavior.
- Tool-node invocation semantics.
- Dashboard runtime-data selection.
- Demo fixtures, traces, reports, or manifest fields.

## Documentation Expectations

Documentation should be source-backed and concrete:

- Prefer real paths such as `packages/sdk/src/client/create-client.ts`.
- Explain current behavior before future plans.
- Keep local devnet wording precise.
- Update related indexes when adding, moving, or renaming docs.
- Do not preserve outdated assumptions in default reading paths.

## Code Expectations

Code changes should follow existing package boundaries:

- `packages/shared` owns shared types and schema contracts.
- `packages/sdk` owns runtime orchestration.
- `packages/cli` should remain a thin shell over SDK behavior.
- `services/tool-node` owns remote execution behavior.
- `examples/audit-agent` is a reference consumer.
- `apps/dashboard` is read-only and should not mutate runtime state.

Avoid introducing new abstractions unless they remove real duplication or clarify an existing boundary.

## Pull Request Description Tips

A useful PR description includes:

```md
## Background

Why this change is needed.

## Changes

- What changed.
- Which paths were touched.

## Verification

- Commands run.
- Manual checks performed.

## Not Included

- Related work intentionally left out.
```

## Common Contribution Scenarios

### Scenario 1: I only want to fix or add documentation

Keep the scope to Markdown files, update links, and run a Chinese-text/link sanity check when relevant.

### Scenario 2: I want to fix a small CLI, SDK, or tool-node issue

Identify the owning package first, make the smallest behavior change, then run package tests and workspace tests.

### Scenario 3: I changed onboarding, quickstart, or the demo runbook

Run the commands shown in the docs or explain why you could not run them. Check that the documented success signals match actual output.

### Scenario 4: I am not sure whether to change docs, examples, or code

Start from the source of truth. If the code is correct and the explanation is stale, change docs. If docs describe the intended MVP and code does not match, change code and tests.

## Submission Checklist

Before submitting:

- The branch has a focused diff.
- Relevant docs and indexes are updated.
- Tests or demo checks match the change risk.
- The PR description includes verification evidence.
- No production claims are made for local MVP adapters.
