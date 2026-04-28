import { randomUUID } from "node:crypto";
import { readFile, rm } from "node:fs/promises";
import { resolve } from "node:path";
import {
  createLocalDevnetClientDeps,
  createLocalDevnetPaths,
  createOpenToolMeshClient,
  findWorkspaceRoot,
  hashJson,
  hashManifest,
  seedCapabilityIndex,
  seedPeerRegistry
} from "../packages/sdk/src/index.ts";
import { createToolNodeServer } from "../services/tool-node/src/server.ts";

interface ScannerFinding {
  ruleId: string;
  severity: "low" | "medium" | "high" | "critical";
  title: string;
  message: string;
}

async function main() {
  const rootDir = await findWorkspaceRoot(new URL(".", import.meta.url).pathname);
  const paths = createLocalDevnetPaths(rootDir);

  await rm(paths.stateDir, { recursive: true, force: true });
  await seedPeerRegistry(rootDir, {
    "axl-peer-solidity-01": "http://127.0.0.1:4318"
  });

  const server = createToolNodeServer().listen(4318);
  await new Promise<void>((resolveReady) => server.once("listening", () => resolveReady()));

  try {
    const client = createOpenToolMeshClient(createLocalDevnetClientDeps(rootDir));
    const manifest = JSON.parse(
      await readFile(new URL("../manifests/solidity-pattern-scanner.manifest.json", import.meta.url), "utf8")
    );
    const nextManifest = structuredClone(manifest);
    nextManifest.integrity.manifestHash = hashManifest(nextManifest);

    const published = await client.publishManifest({ manifest: nextManifest });
    nextManifest.storage.manifestUri = published.manifestUri;
    nextManifest.integrity.manifestHash = published.manifestHash;
    await seedCapabilityIndex(rootDir, nextManifest);

    const discovered = await client.discoverTools({ capability: "solidity-static-analysis", limit: 1 });
    const selectedTool = discovered[0];

    if (!selectedTool) {
      throw new Error("No discovered tool for capability solidity-static-analysis");
    }

    const resolved = await client.resolveIdentity({ ensName: "solidity-scanner.auditagent.eth" });
    const loadedManifest = await client.loadManifest({ manifestUri: selectedTool.manifestUri });
    const verification = await client.verifyManifest({
      identity: resolved,
      manifest: loadedManifest,
      sdkVersion: "0.1.0"
    });

    if (!verification.ok) {
      throw new Error(`Manifest verification failed: ${verification.errors.join(", ")}`);
    }

    const source = await readFile(resolve(rootDir, "examples/audit-agent/fixtures/sample-contract.sol"), "utf8");
    const traceId = randomUUID();
    const invocationStartedAt = new Date().toISOString();
    const response = await client.invokeTool<{ source: string }, { findings: ScannerFinding[]; summary: Record<string, number>; sourceLength: number }>({
      capability: "solidity-static-analysis",
      tool: resolved,
      manifest: loadedManifest,
      agentId: "demo-runner",
      input: { source },
      traceId
    });

    const findings =
      response.status === "ok"
        ? (response.output?.findings ?? []).map((finding) => ({
            id: finding.ruleId,
            severity: finding.severity,
            title: finding.title,
            description: finding.message,
            evidence: finding.message,
            traceId,
            toolId: selectedTool.id
          }))
        : [];

    const report = await client.buildAuditReport({
      contractName: "Vault",
      summary:
        "Capability discovery resolved solidity-static-analysis to a remote Solidity scanner, then completed manifest verification, AXL invocation, trace persistence, and report generation.",
      findings
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

    const trace = {
      traceId,
      runId: traceId,
      agentId: "demo-runner",
      requestedCapability: "solidity-static-analysis",
      tool: {
        toolId: selectedTool.id,
        ensName: selectedTool.ensName,
        manifestUri: loadedManifest.storage.manifestUri,
        manifestHash: loadedManifest.integrity.manifestHash,
        version: loadedManifest.version,
        ownerAddress: selectedTool.ownerAddress
      },
      discovery: {
        capabilityIndexUri: "0g://indexes/capabilities/solidity-static-analysis.json",
        candidateCount: discovered.length,
        selectedReason: "selected from capability discovery candidates for solidity-static-analysis",
        resolvedAt: new Date().toISOString()
      },
      verification: {
        ...verification.checks,
        verifiedAt: new Date().toISOString()
      },
      invocation: {
        transport: "axl" as const,
        peerId: loadedManifest.invocation.axlPeerId,
        method: loadedManifest.invocation.axlMethod,
        startedAt: invocationStartedAt,
        finishedAt: response.finishedAt,
        status: response.status === "ok" ? "ok" as const : "error" as const
      },
      io: {
        inputHash: hashJson({ source }),
        outputHash: response.output ? hashJson(response.output) : undefined
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
        {
          kind: "audit-report" as const,
          uri: reportArtifact.uri,
          hash: reportArtifact.hash,
          mediaType: "application/json"
        }
      ],
      storage: {
        traceUri: "",
        persistedAt: new Date().toISOString(),
        backend: "0g-storage" as const
      }
    };

    const firstPersist = await client.recordTrace({ trace });
    trace.storage.traceUri = firstPersist.traceUri;
    const persistedTrace = await client.recordTrace({ trace });

    console.log(
      JSON.stringify(
        {
          publish: {
            toolId: nextManifest.toolId,
            manifestUri: published.manifestUri,
            manifestHash: published.manifestHash,
            version: published.version
          },
          discover: discovered,
          resolve: resolved,
          verify: verification,
          call: {
            traceId,
            status: response.status,
            output: response.output
          },
          trace: {
            traceId,
            traceUri: persistedTrace.traceUri
          },
          report: {
            reportId: report.reportId,
            reportUri: reportArtifact.uri
          },
          files: {
            ensRecords: paths.ensFile,
            peerRegistry: paths.peersFile,
            trace: resolve(paths.storageDir, "traces", `${traceId}.json`),
            artifact: resolve(paths.storageDir, "artifacts", `${traceId}.json`),
            report: resolve(paths.storageDir, "reports", `${report.reportId}.json`)
          }
        },
        null,
        2
      )
    );
  } finally {
    await new Promise<void>((resolveClosed, rejectClosed) => {
      server.close((error) => {
        if (error) {
          rejectClosed(error);
          return;
        }
        resolveClosed();
      });
    });
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
