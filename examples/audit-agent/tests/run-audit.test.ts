import { describe, expect, it } from "vitest";
import { buildTrace } from "../src/run-audit.js";

describe("runAudit trace semantics", () => {
  it("records invocation start before finish and preserves capability discovery evidence", () => {
    const trace = buildTrace(
      {
        id: "otm:ens:solidity-scanner.auditagent.eth",
        ensName: "solidity-scanner.auditagent.eth",
        latestManifestUri: "0g://manifests/tool.json",
        latestManifestHash: "sha256:manifest",
        latestVersion: "0.1.0",
        ownerAddress: "0x1234567890abcdef1234567890abcdef12345678"
      },
      "0g://manifests/tool.json",
      "sha256:manifest",
      "0.1.0",
      {
        manifestHashValid: true,
        ownerValid: true,
        schemaValid: true,
        versionCompatible: true
      },
      {
        status: "ok",
        finishedAt: "2026-04-28T15:30:01.000Z",
        output: { findings: [] }
      },
      "sha256:input",
      "sha256:output",
      { uri: "0g://reports/report.json", hash: "sha256:report" },
      { uri: "0g://artifacts/output.json", hash: "sha256:artifact" },
      "trace-3",
      "2026-04-28T15:30:00.000Z"
    );

    expect(trace.invocation.startedAt).toBe("2026-04-28T15:30:00.000Z");
    expect(trace.invocation.finishedAt).toBe("2026-04-28T15:30:01.000Z");
    expect(trace.discovery.selectedReason).toContain("capability discovery");
    expect(trace.discovery.capabilityIndexUri).toBe("0g://indexes/capabilities/solidity-static-analysis.json");
  });
});
