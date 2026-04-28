# Dashboard Runtime Data Source

`apps/dashboard/lib/demo-run.ts` must resolve dashboard content from the latest successful `demo:run` runtime first.

Rules:
- Preferred source: newest `.opentoolmesh/storage/traces/*.json` whose `invocation.status` is `ok`.
- The selected trace must have a matching `tool-output` artifact and `audit-report` artifact, and both files must point to the same `traceId`.
- The manifest/report/artifact shown on the page must come from that same runtime set.
- Only when runtime files are missing or inconsistent may the dashboard fall back to the bundled fixture.

This keeps dashboard output aligned with the demo runbook and with DevOps task `e49ec363`.
