import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { AuditReport, ExecutionTrace } from "@opentoolmesh/shared";
import {
  createLocalDevnetClientDeps,
  createOpenToolMeshClient,
  fileDir,
  findWorkspaceRoot,
  hashJson
} from "@opentoolmesh/sdk";

interface ScannerFinding {
  ruleId: string;
  severity: "low" | "medium" | "high" | "critical";
  title: string;
  message: string;
}

export function buildTrace(
  tool: Awaited<ReturnType<ReturnType<typeof createOpenToolMeshClient>["resolveIdentity"]>>,
  manifestUri: string,
  manifestHash: string,
  version: string,
  verification: {
    manifestHashValid: boolean;
    ownerValid: boolean;
    schemaValid: boolean;
    versionCompatible: boolean;
  },
  response: { status: "ok" | "error"; finishedAt: string; output?: unknown },
  inputHash: string,
  outputHash: string | undefined,
  reportArtifact: { uri: string; hash: string } | null,
  outputArtifact: { uri: string; hash: string } | null,
  traceId: string,
  invocationStartedAt: string
): ExecutionTrace {
  return {
    traceId,
    runId: traceId,
    agentId: "audit-agent-example",
    requestedCapability: "solidity-static-analysis",
    tool: {
      toolId: tool.id,
      ensName: tool.ensName,
      manifestUri,
      manifestHash,
      version,
      ownerAddress: tool.ownerAddress
    },
    discovery: {
      candidateCount: 1,
      capabilityIndexUri: "0g://indexes/capabilities/solidity-static-analysis.json",
      selectedReason: "selected from capability discovery candidates for solidity-static-analysis",
      resolvedAt: new Date().toISOString()
    },
    verification: {
      ...verification,
      verifiedAt: new Date().toISOString()
    },
    invocation: {
      transport: "axl",
      peerId: "axl-peer-solidity-01",
      method: "invokeTool",
      startedAt: invocationStartedAt,
      finishedAt: response.finishedAt,
      status: response.status === "ok" ? "ok" : "error"
    },
    io: {
      inputHash,
      outputHash
    },
    artifacts: [
      ...(outputArtifact
        ? [
            {
              kind: "tool-output" as const,
              uri: outputArtifact.uri,
              hash: outputArtifact.hash,
              mediaType: "application/json"
            }
          ]
        : []),
      ...(reportArtifact
        ? [
            {
              kind: "audit-report" as const,
              uri: reportArtifact.uri,
              hash: reportArtifact.hash,
              mediaType: "application/json"
            }
          ]
        : [])
    ],
    storage: {
      traceUri: "",
      persistedAt: new Date().toISOString(),
      backend: "0g-storage"
    }
  };
}

export async function runAuditDemo() {
  const rootDir = await findWorkspaceRoot(fileDir(import.meta.url));
  const client = createOpenToolMeshClient(createLocalDevnetClientDeps(rootDir));
  const discovered = await client.discoverTools({ capability: "solidity-static-analysis", limit: 1 });
  const selectedTool = discovered[0];

  if (!selectedTool) {
    throw new Error("No discovered tool for capability solidity-static-analysis. Run publish first.");
  }

  const manifest = await client.loadManifest({ manifestUri: selectedTool.manifestUri });
  const verification = await client.verifyManifest({
    identity: selectedTool,
    manifest,
    sdkVersion: "0.1.0"
  });

  if (!verification.ok) {
    throw new Error(`Manifest verification failed: ${verification.errors.join(", ")}`);
  }

  const source = await readFile(resolve(rootDir, "examples/audit-agent/fixtures/sample-contract.sol"), "utf8");
  const traceId = randomUUID();
  const invocationStartedAt = new Date().toISOString();
  const response = await client.invokeTool<{ source: string }, { findings: ScannerFinding[]; summary: Record<string, number> }>({
    capability: "solidity-static-analysis",
    tool: selectedTool,
    manifest,
    agentId: "audit-agent-example",
    input: { source },
    traceId
  });

  const report = await client.buildAuditReport({
    contractName: "Vault",
    summary:
      response.status === "ok"
        ? "Capability discovery resolved solidity-static-analysis to a remote Solidity scanner, then completed the AXL invocation and trace persistence."
        : "Capability discovery resolved a remote Solidity scanner, but the AXL invocation failed.",
    findings:
      response.status === "ok"
        ? response.output?.findings.map((finding) => ({
            id: finding.ruleId,
            severity: finding.severity,
            title: finding.title,
            description: finding.message,
            evidence: finding.message,
            traceId,
            toolId: selectedTool.id
          })) ?? []
        : []
  });

  const outputArtifact =
    response.status === "ok"
      ? await client.saveArtifact({
          namespace: "artifacts",
          artifact: {
            traceId,
            toolId: selectedTool.id,
            output: response.output
          }
        })
      : null;
  const reportArtifact = await client.saveArtifact({
    namespace: "reports",
    artifact: report
  });

  const trace = buildTrace(
    selectedTool,
    manifest.storage.manifestUri,
    manifest.integrity.manifestHash,
    manifest.version,
    verification.checks,
    response,
    hashJson({ source }),
    response.output ? hashJson(response.output) : undefined,
    reportArtifact,
    outputArtifact,
    traceId,
    invocationStartedAt
  );
  const firstPersist = await client.recordTrace({ trace });
  trace.storage.traceUri = firstPersist.traceUri;
  const persistedTrace = await client.recordTrace({ trace });

  return {
    requestedCapability: "solidity-static-analysis",
    tool: selectedTool,
    discovery: {
      mode: "capability-discovery",
      selectedReason: trace.discovery.selectedReason,
      candidateCount: trace.discovery.candidateCount
    },
    toolId: selectedTool.id,
    manifestUri: manifest.storage.manifestUri,
    verification,
    traceId,
    traceUri: persistedTrace.traceUri,
    reportUri: reportArtifact.uri,
    report,
    response
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const result = await runAuditDemo();
  console.log(JSON.stringify(result, null, 2));
}
