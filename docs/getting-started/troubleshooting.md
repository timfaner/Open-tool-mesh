# OpenTool Mesh Startup Troubleshooting

Use this page when the first-run path fails. Each section lists the likely cause, how to confirm it, and the usual fix.

## How To Use This Page

Start with the error message you see. If there is no exact match, run the preflight command:

```bash
corepack pnpm demo:preflight
```

Then compare the reported environment with the requirements in [Quick Start](./quickstart.md).

## Error 1: `vitest: not found`

Likely cause:

- Workspace dependencies have not been installed.

Confirm:

```bash
ls node_modules
```

Fix:

```bash
corepack enable
corepack pnpm install
corepack pnpm test
```

## Error 2: `tsc: not found`

Likely cause:

- TypeScript is unavailable because dependencies are missing or installation failed.

Fix:

```bash
corepack pnpm install
corepack pnpm build
```

If this still fails, remove only generated dependency/build output that you understand, reinstall, and retry. Do not delete source files to fix dependency resolution.

## Error 3: Node Version Is Too Old

Likely cause:

- The active Node.js version is older than the repository requirement.

Confirm:

```bash
node --version
```

Fix:

- Switch to Node.js 20 or newer.
- Re-run dependency installation after switching versions.

```bash
corepack enable
corepack pnpm install
```

## Error 4: Dashboard Port `3000` Is Already in Use

Likely cause:

- Another local service is listening on `127.0.0.1:3000`.

Confirm:

```bash
lsof -i :3000
```

Fix:

- Stop the existing service if it is no longer needed.
- Or run the dashboard on another supported port.

Then check:

```bash
curl -s http://127.0.0.1:3000/api/health
```

## Error 5: Dashboard Did Not Load the Latest Runtime Data

Likely cause:

- No successful runtime trace exists under `.opentoolmesh/storage/traces/`.
- The latest trace is incomplete or failed.
- Related artifact, report, or manifest files are missing.

Fix:

```bash
corepack pnpm demo:run
```

Then refresh the dashboard. The dashboard should prefer the latest complete successful trace and only use fixture fallback when no valid runtime trace exists.

Useful files:

- `.opentoolmesh/storage/traces/`
- `.opentoolmesh/storage/artifacts/`
- `.opentoolmesh/storage/reports/`
- `.opentoolmesh/storage/manifests/`
- `apps/dashboard/lib/demo-run.ts`

## Error 6: Health Check Failed

Dashboard health:

```bash
curl -s http://127.0.0.1:3000/api/health
```

Tool-node health:

```bash
curl -s http://127.0.0.1:4318/health
```

If dashboard health fails, start:

```bash
corepack pnpm dashboard:dev
```

If tool-node health fails, start:

```bash
corepack pnpm demo:tool-node
```

If both are running but the demo still fails, run:

```bash
corepack pnpm demo:run
```

## Still Stuck

Capture:

- The exact command you ran.
- The full error output.
- `node --version`
- Whether `corepack pnpm install` completed.
- Whether `.opentoolmesh/` exists after `demo:run`.

Then compare the command path with [Demo Runbook](../demo/opentool-mesh-demo-runbook.md).

## Next Steps

- [Quick Start](./quickstart.md)
- [Demo Docs](../demo/README.md)
- [Architecture Docs](../architecture/README.md)
