import type { CliCommand } from "./types.js";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { hashJson } from "@opentoolmesh/sdk";
import type { ExecutionTrace } from "@opentoolmesh/shared";
import { createCliClient, getFlag, readJsonFromFile } from "./helpers.js";
import type { CliCommandContext } from "./types.js";

export interface CallCommandDeps {
  createCliClient: typeof createCliClient;
  readJsonFromFile: typeof readJsonFromFile;
  readFile: typeof readFile;
  randomUUID: typeof randomUUID;
  now: () => string;
}

const defaultDeps: CallCommandDeps = {
  createCliClient,
  readJsonFromFile,
  readFile,
  randomUUID,
  now: () => new Date().toISOString()
};

export async function runCallCommand(args: string[], context: CliCommandContext, deps: CallCommandDeps = defaultDeps) {
  const tool = args.includes("--tool") ? getFlag(args, "--tool") : undefined;
  const capability = args.includes("--capability")
    ? getFlag(args, "--capability")
    : "solidity-static-analysis";
  const inputPath = getFlag(args, "--input");
  const { client } = await deps.createCliClient(context.cwd);
  const discoveredTools = tool
    ? []
    : await client.discoverTools({
        capability,
        limit: 1
      });
  const selectedTool = tool ? undefined : discoveredTools[0];
  if (!tool && !selectedTool) {
    throw new Error(`No discovered tool for capability ${capability}`);
  }
  const identity = await client.resolveIdentity({ ensName: tool ?? selectedTool?.ensName ?? "" });
  const manifest = await client.loadManifest({ manifestUri: identity.latestManifestUri });
  const traceId = deps.randomUUID();
  const rawInput = await deps.readJsonFromFile<{ sourceFile?: string; source?: string }>(context.cwd, inputPath);
  const source =
    rawInput.source ??
    (rawInput.sourceFile
      ? await deps.readFile(resolve(context.cwd, rawInput.sourceFile), "utf8")
      : undefined);

  if (!source) {
    throw new Error("call input must contain source or sourceFile");
  }

  const selectedCapability = manifest.capabilities[0]?.id ?? capability;
  const selectedReason = tool
    ? "resolved from CLI tool argument"
    : `selected first discovered candidate for capability ${capability}`;
  const resolveEvidence = tool
    ? `resolveIdentity(${identity.ensName}) -> loadManifest(${identity.latestManifestUri}) -> verifyManifest -> invokeTool`
    : `discover(${capability}) -> resolveIdentity(${identity.ensName}) -> loadManifest(${identity.latestManifestUri}) -> verifyManifest -> invokeTool`;

  const verification = await client.verifyManifest({
    identity,
    manifest,
    sdkVersion: "0.1.0"
  });

  if (!verification.ok) {
    const trace: ExecutionTrace = {
      traceId,
      runId: traceId,
      agentId: "opentool-cli",
      requestedCapability: selectedCapability,
      tool: {
        toolId: identity.id,
        ensName: identity.ensName,
        manifestUri: identity.latestManifestUri,
        manifestHash: identity.latestManifestHash,
        version: identity.latestVersion,
        ownerAddress: identity.ownerAddress
      },
      discovery: {
        candidateCount: tool ? 1 : discoveredTools.length,
        capabilityIndexUri: tool ? undefined : `0g://indexes/capabilities/${capability}.json`,
        selectedReason,
        resolvedAt: deps.now(),
        resolve: {
          ensName: identity.ensName,
          identityId: identity.id,
          manifestUri: identity.latestManifestUri,
          manifestHash: identity.latestManifestHash,
          version: identity.latestVersion,
          ownerAddress: identity.ownerAddress,
          evidence: resolveEvidence
        }
      },
      verification: {
        ...verification.checks,
        rejectedReason: verification.errors.join(", "),
        verifiedAt: deps.now()
      },
      invocation: {
        transport: "axl",
        peerId: manifest.invocation.axlPeerId,
        method: manifest.invocation.axlMethod,
        startedAt: deps.now(),
        status: "rejected"
      },
      io: {
        inputHash: hashJson({ source })
      },
      artifacts: [],
      storage: {
        traceUri: "",
        persistedAt: deps.now(),
        backend: "0g-storage"
      }
    };
    const persistedTrace = await client.recordTrace({ trace });
    context.stdout.log(
      JSON.stringify(
        {
          traceId,
          status: "rejected",
          errors: verification.errors,
          traceUri: persistedTrace.traceUri
        },
        null,
        2
      )
    );
    return;
  }

  const invocationStartedAt = deps.now();
  const requestArtifact = await client.saveArtifact({
    namespace: "artifacts",
    artifact: {
      traceId,
      type: "invocation-request",
      capability: selectedCapability,
      toolId: identity.id,
      manifestUri: identity.latestManifestUri,
      input: { source }
    }
  });
  const response = await client.invokeTool<{ source: string }, unknown>({
    capability: selectedCapability,
    tool: identity,
    manifest,
    agentId: "opentool-cli",
    input: { source },
    traceId
  });

  const trace: ExecutionTrace = {
    traceId,
    runId: traceId,
    agentId: "opentool-cli",
    requestedCapability: selectedCapability,
    tool: {
      toolId: identity.id,
      ensName: identity.ensName,
      manifestUri: identity.latestManifestUri,
      manifestHash: identity.latestManifestHash,
      version: identity.latestVersion,
      ownerAddress: identity.ownerAddress
    },
    discovery: {
      candidateCount: tool ? 1 : discoveredTools.length,
      capabilityIndexUri: tool ? undefined : `0g://indexes/capabilities/${capability}.json`,
      selectedReason,
      resolvedAt: deps.now(),
      resolve: {
        ensName: identity.ensName,
        identityId: identity.id,
        manifestUri: identity.latestManifestUri,
        manifestHash: identity.latestManifestHash,
        version: identity.latestVersion,
        ownerAddress: identity.ownerAddress,
        evidence: resolveEvidence
      }
    },
    verification: {
      ...verification.checks,
      verifiedAt: deps.now()
    },
    invocation: {
      transport: "axl",
      peerId: manifest.invocation.axlPeerId,
      method: manifest.invocation.axlMethod,
      requestUri: requestArtifact.uri,
      startedAt: invocationStartedAt,
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
      persistedAt: deps.now(),
      backend: "0g-storage"
    }
  };

  trace.artifacts.push({
    kind: "invocation-request",
    uri: requestArtifact.uri,
    hash: requestArtifact.hash,
    mediaType: "application/json"
  });

  const responseArtifact = await client.saveArtifact({
    namespace: "artifacts",
    artifact: {
      traceId,
      type: "invocation-response",
      toolId: identity.id,
      response
    }
  });
  trace.invocation.responseUri = responseArtifact.uri;
  trace.artifacts.push({
    kind: "invocation-response",
    uri: responseArtifact.uri,
    hash: responseArtifact.hash,
    mediaType: "application/json"
  });

  const artifact = response.output
    ? await client.saveArtifact({
        namespace: "artifacts",
        artifact: {
          traceId,
          type: "tool-output",
          toolId: identity.id,
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

export const callCommand: CliCommand = {
  name: "call",
  description: "Invoke a tool and optionally record a trace",
  async run(args, context) {
    await runCallCommand(args, context);
  }
};
