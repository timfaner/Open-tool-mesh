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
  const tool = getFlag(args, "--tool");
  const inputPath = getFlag(args, "--input");
  const { client } = await deps.createCliClient(context.cwd);
  const identity = await client.resolveIdentity({ ensName: tool });
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
        resolvedAt: deps.now()
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
    const firstPersist = await client.recordTrace({ trace });
    trace.storage.traceUri = firstPersist.traceUri;
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
  const response = await client.invokeTool<{ source: string }, unknown>({
    capability: manifest.capabilities[0]?.id ?? "solidity-static-analysis",
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
      resolvedAt: deps.now()
    },
    verification: {
      ...verification.checks,
      verifiedAt: deps.now()
    },
    invocation: {
      transport: "axl",
      peerId: manifest.invocation.axlPeerId,
      method: manifest.invocation.axlMethod,
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

export const callCommand: CliCommand = {
  name: "call",
  description: "Invoke a tool and optionally record a trace",
  async run(args, context) {
    await runCallCommand(args, context);
  }
};
