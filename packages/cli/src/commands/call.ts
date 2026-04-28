import type { CliCommand } from "./types.js";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { hashJson } from "@opentoolmesh/sdk";
import type { ExecutionTrace } from "@opentoolmesh/shared";
import { createCliClient, getFlag, readJsonFromFile } from "./helpers.js";

export const callCommand: CliCommand = {
  name: "call",
  description: "Invoke a tool and optionally record a trace",
  async run(args, context) {
    const tool = getFlag(args, "--tool");
    const inputPath = getFlag(args, "--input");
    const { client } = await createCliClient(context.cwd);
    const identity = await client.resolveIdentity({ ensName: tool });
    const manifest = await client.loadManifest({ manifestUri: identity.latestManifestUri });
    const traceId = randomUUID();
    const rawInput = await readJsonFromFile<{ sourceFile?: string; source?: string }>(context.cwd, inputPath);
    const source =
      rawInput.source ??
      (rawInput.sourceFile
        ? await readFile(resolve(context.cwd, rawInput.sourceFile), "utf8")
        : undefined);

    if (!source) {
      throw new Error("call input must contain source or sourceFile");
    }

    const response = await client.invokeTool<{ source: string }, unknown>({
      capability: manifest.capabilities[0]?.id ?? "solidity-static-analysis",
      tool: identity,
      manifest,
      agentId: "opentool-cli",
      input: { source },
      traceId
    });

    const verification = await client.verifyManifest({
      identity,
      manifest,
      sdkVersion: "0.1.0"
    });

    const trace: ExecutionTrace = {
      traceId,
      runId: traceId,
      agentId: "opentool-cli",
      requestedCapability: manifest.capabilities[0]?.id ?? "solidity-static-analysis",
      tool: {
        toolId: identity.id,
        ensName: identity.ensName,
        manifestUri: identity.latestManifestUri,
        manifestHash: identity.latestManifestHash,
        version: identity.latestVersion,
        ownerAddress: identity.ownerAddress
      },
      discovery: {
        candidateCount: 1,
        selectedReason: "resolved from CLI tool argument",
        resolvedAt: new Date().toISOString()
      },
      verification: {
        ...verification.checks,
        verifiedAt: new Date().toISOString()
      },
      invocation: {
        transport: "axl",
        peerId: manifest.invocation.axlPeerId,
        method: manifest.invocation.axlMethod,
        startedAt: new Date().toISOString(),
        finishedAt: response.finishedAt,
        status: response.status === "ok" ? "ok" : "error"
      },
      io: {
        inputHash: hashJson({ source }),
        outputHash: response.output ? hashJson(response.output) : undefined
      },
      artifacts: [],
      storage: {
        traceUri: "",
        persistedAt: new Date().toISOString(),
        backend: "0g-storage"
      }
    };

    const artifact = response.output
      ? await client.saveArtifact({
          namespace: "artifacts",
          artifact: {
            traceId,
            output: response.output
          }
        })
      : null;

    if (artifact) {
      trace.artifacts.push({
        kind: "tool-output",
        uri: artifact.uri,
        hash: artifact.hash,
        mediaType: "application/json"
      });
    }

    const firstPersist = await client.recordTrace({ trace });
    trace.storage.traceUri = firstPersist.traceUri;
    const persistedTrace = await client.recordTrace({ trace });
    context.stdout.log(
      JSON.stringify(
        {
          traceId,
          status: response.status,
          output: response.output,
          traceUri: persistedTrace.traceUri
        },
        null,
        2
      )
    );
  }
};
