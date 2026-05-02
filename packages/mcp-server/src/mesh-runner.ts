import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  createOpenToolMeshClient,
  createProviderClientDeps,
  createProviderConfigFromEnv,
  findWorkspaceRoot,
  hashJson,
  hashManifest
} from "@opentoolmesh/sdk";
import type { ExecutionTrace, ToolManifest } from "@opentoolmesh/shared";
import type {
  CallOpenToolMeshCapabilityInput,
  DiscoverOpenToolMeshToolsInput,
  DiscoverOpenToolMeshToolsResult,
  GetOpenToolMeshTraceInput,
  GetOpenToolMeshTraceResult,
  OpenToolMeshCapabilityCallResult,
  PublishOpenToolMeshManifestInput,
  PublishOpenToolMeshManifestResult,
  ResolveOpenToolMeshToolInput,
  ResolveOpenToolMeshToolResult,
  VerifyOpenToolMeshToolInput,
  VerifyOpenToolMeshToolResult
} from "./types.js";

const DEFAULT_AGENT_ID = "opentoolmesh-mcp-agent";
const DEFAULT_SDK_VERSION = "0.1.0";

export async function callOpenToolMeshCapability(
  options: CallOpenToolMeshCapabilityInput
): Promise<OpenToolMeshCapabilityCallResult> {
  const { client, workspaceRoot } = await createMcpRuntime(options.workspaceRoot);
  const agentId = options.agentId ?? DEFAULT_AGENT_ID;
  const sdkVersion = options.sdkVersion ?? DEFAULT_SDK_VERSION;
  const discovered = await client.discoverTools({ capability: options.capability, limit: 1 });
  const selected = discovered[0];

  if (!selected) {
    throw new Error(`No discovered tool for capability ${options.capability}`);
  }

  const resolvedTool = await client.resolveIdentity({ ensName: selected.ensName });
  const manifest = await client.loadManifest({ manifestUri: resolvedTool.latestManifestUri });
  const verification = await client.verifyManifest({
    identity: resolvedTool,
    manifest,
    sdkVersion
  });

  const traceId = randomUUID();
  const invocationStartedAt = new Date().toISOString();
  const requestArtifact = await client.saveArtifact({
    namespace: "artifacts",
    artifact: {
      traceId,
      type: "mcp-invocation-request",
      capability: options.capability,
      toolId: resolvedTool.id,
      manifestUri: resolvedTool.latestManifestUri,
      input: options.input,
      agentId
    }
  });

  if (!verification.ok) {
    const trace = buildRejectedTrace({
      agentId,
      capability: options.capability,
      resolvedTool,
      verification,
      manifest,
      traceId,
      input: options.input,
      requestUri: requestArtifact.uri,
      requestHash: requestArtifact.hash,
      startedAt: invocationStartedAt
    });
    const persistedTrace = await client.recordTrace({ trace });
    throw new Error(
      `Manifest verification failed for ${resolvedTool.id}: ${verification.errors.join(", ")}; trace=${persistedTrace.traceUri}`
    );
  }

  const response = await client.invokeTool<Record<string, unknown>, unknown>({
    capability: options.capability,
    tool: resolvedTool,
    manifest,
    agentId,
    input: options.input,
    traceId
  });
  const responseArtifact = await client.saveArtifact({
    namespace: "artifacts",
    artifact: {
      traceId,
      type: "mcp-invocation-response",
      capability: options.capability,
      toolId: resolvedTool.id,
      response
    }
  });
  const outputArtifact =
    response.status === "ok" && response.output !== undefined
      ? await client.saveArtifact({
          namespace: "artifacts",
          artifact: {
            traceId,
            type: "mcp-tool-output",
            capability: options.capability,
            toolId: resolvedTool.id,
            output: response.output
          }
        })
      : undefined;
  const trace = buildInvocationTrace({
    agentId,
    capability: options.capability,
    resolvedTool,
    verification,
    manifest,
    traceId,
    input: options.input,
    response,
    requestUri: requestArtifact.uri,
    requestHash: requestArtifact.hash,
    responseUri: responseArtifact.uri,
    responseHash: responseArtifact.hash,
    outputUri: outputArtifact?.uri,
    outputHash: outputArtifact?.hash,
    startedAt: invocationStartedAt
  });
  const persistedTrace = await client.recordTrace({ trace });

  return {
    capability: options.capability,
    agentId,
    status: response.status,
    output: response.output,
    error: response.error,
    tool: {
      toolId: resolvedTool.id,
      ensName: resolvedTool.ensName,
      manifestUri: resolvedTool.latestManifestUri,
      manifestHash: resolvedTool.latestManifestHash,
      version: resolvedTool.latestVersion,
      ownerAddress: resolvedTool.ownerAddress
    },
    verification,
    traceId,
    traceUri: persistedTrace.traceUri,
    artifacts: {
      requestUri: requestArtifact.uri,
      responseUri: responseArtifact.uri,
      outputUri: outputArtifact?.uri
    },
    response
  };
}

export async function publishOpenToolMeshManifest(
  options: PublishOpenToolMeshManifestInput
): Promise<PublishOpenToolMeshManifestResult> {
  const { client, workspaceRoot, providerConfig } = await createMcpRuntime(options.workspaceRoot);
  const manifest = await loadManifestInput(workspaceRoot, options);
  manifest.integrity.manifestHash = hashManifest(manifest);
  const published = await client.publishManifest({ manifest });

  return {
    toolId: manifest.toolId,
    manifestUri: published.manifestUri,
    manifestHash: published.manifestHash,
    version: published.version,
    capabilities: manifest.capabilities.map((capability) => capability.id),
    providerProfile: providerConfig.profile,
    published
  };
}

export async function discoverOpenToolMeshTools(
  options: DiscoverOpenToolMeshToolsInput
): Promise<DiscoverOpenToolMeshToolsResult> {
  const { client } = await createMcpRuntime(options.workspaceRoot);
  const tools = await client.discoverTools({
    capability: options.capability,
    limit: options.limit
  });

  return {
    capability: options.capability,
    count: tools.length,
    tools
  };
}

export async function resolveOpenToolMeshTool(
  options: ResolveOpenToolMeshToolInput
): Promise<ResolveOpenToolMeshToolResult> {
  const { client } = await createMcpRuntime(options.workspaceRoot);
  return {
    identity: await client.resolveIdentity({ ensName: options.ensName })
  };
}

export async function verifyOpenToolMeshTool(
  options: VerifyOpenToolMeshToolInput
): Promise<VerifyOpenToolMeshToolResult> {
  const { client } = await createMcpRuntime(options.workspaceRoot);
  const identity = await client.resolveIdentity({ ensName: options.ensName });
  const manifest = await client.loadManifest({
    manifestUri: options.manifestUri ?? identity.latestManifestUri
  });
  const verification = await client.verifyManifest({
    identity,
    manifest,
    sdkVersion: options.sdkVersion ?? DEFAULT_SDK_VERSION
  });

  return {
    identity,
    manifest,
    verification
  };
}

export async function getOpenToolMeshTrace(
  options: GetOpenToolMeshTraceInput
): Promise<GetOpenToolMeshTraceResult> {
  const { deps } = await createMcpRuntime(options.workspaceRoot);
  const traceUri = options.traceUri ?? (options.traceId ? `0g://traces/${options.traceId}.json` : undefined);

  if (!traceUri) {
    throw new Error("get_trace requires traceUri or traceId");
  }

  const trace = await deps.blob.getJson<ExecutionTrace>(traceUri);
  return {
    traceId: trace.traceId,
    traceUri,
    trace
  };
}

async function createMcpRuntime(workspaceRootInput?: string) {
  const workspaceRoot = workspaceRootInput ?? (await findWorkspaceRoot(process.cwd()));
  const providerConfig = createProviderConfigFromEnv(process.env, workspaceRoot);
  const deps = createProviderClientDeps(providerConfig);
  const client = createOpenToolMeshClient(deps);
  return {
    client,
    deps,
    workspaceRoot,
    providerConfig
  };
}

async function loadManifestInput(
  workspaceRoot: string,
  options: PublishOpenToolMeshManifestInput
): Promise<ToolManifest> {
  if (options.manifest) {
    return structuredClone(options.manifest);
  }

  if (!options.manifestPath) {
    throw new Error("publish_tool requires manifest or manifestPath");
  }

  const manifestPath = resolve(workspaceRoot, options.manifestPath);
  return JSON.parse(await readFile(manifestPath, "utf8")) as ToolManifest;
}

type ResolvedTool = Awaited<
  ReturnType<ReturnType<typeof createOpenToolMeshClient>["resolveIdentity"]>
>;
type VerificationChecks = Pick<
  ExecutionTrace["verification"],
  "manifestHashValid" | "ownerValid" | "schemaValid" | "versionCompatible"
>;

function buildInvocationTrace(input: {
  agentId: string;
  capability: string;
  resolvedTool: ResolvedTool;
  verification: { checks: VerificationChecks };
  manifest: {
    invocation: { axlPeerId: string; axlMethod: string };
  };
  traceId: string;
  input: Record<string, unknown>;
  response: { status: "ok" | "error"; finishedAt: string; output?: unknown };
  requestUri: string;
  requestHash: string;
  responseUri: string;
  responseHash: string;
  outputUri?: string;
  outputHash?: string;
  startedAt: string;
}): ExecutionTrace {
  return {
    traceId: input.traceId,
    runId: input.traceId,
    agentId: input.agentId,
    requestedCapability: input.capability,
    tool: {
      toolId: input.resolvedTool.id,
      ensName: input.resolvedTool.ensName,
      manifestUri: input.resolvedTool.latestManifestUri,
      manifestHash: input.resolvedTool.latestManifestHash,
      version: input.resolvedTool.latestVersion,
      ownerAddress: input.resolvedTool.ownerAddress
    },
    discovery: {
      candidateCount: 1,
      capabilityIndexUri: `0g://indexes/capabilities/${input.capability}.json`,
      selectedReason: "selected by MCP capability call after OpenTool Mesh discovery",
      resolvedAt: new Date().toISOString(),
      resolve: {
        ensName: input.resolvedTool.ensName,
        identityId: input.resolvedTool.id,
        manifestUri: input.resolvedTool.latestManifestUri,
        manifestHash: input.resolvedTool.latestManifestHash,
        version: input.resolvedTool.latestVersion,
        ownerAddress: input.resolvedTool.ownerAddress,
        evidence: `mcp/tools.call -> discover(${input.capability}) -> resolveIdentity(${input.resolvedTool.ensName}) -> loadManifest -> verifyManifest -> invokeTool`
      }
    },
    verification: {
      ...input.verification.checks,
      verifiedAt: new Date().toISOString()
    },
    invocation: {
      transport: "axl",
      peerId: input.manifest.invocation.axlPeerId,
      method: input.manifest.invocation.axlMethod,
      requestUri: input.requestUri,
      responseUri: input.responseUri,
      startedAt: input.startedAt,
      finishedAt: input.response.finishedAt,
      status: input.response.status
    },
    io: {
      inputHash: hashJson(input.input),
      outputHash: input.response.output === undefined ? undefined : hashJson(input.response.output)
    },
    artifacts: [
      {
        kind: "invocation-request",
        uri: input.requestUri,
        hash: input.requestHash,
        mediaType: "application/json"
      },
      {
        kind: "invocation-response",
        uri: input.responseUri,
        hash: input.responseHash,
        mediaType: "application/json"
      },
      ...(input.outputUri && input.outputHash
        ? [
            {
              kind: "tool-output" as const,
              uri: input.outputUri,
              hash: input.outputHash,
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

function buildRejectedTrace(input: {
  agentId: string;
  capability: string;
  resolvedTool: ResolvedTool;
  verification: { checks: VerificationChecks; errors: string[] };
  manifest: {
    invocation: { axlPeerId: string; axlMethod: string };
  };
  traceId: string;
  input: Record<string, unknown>;
  requestUri: string;
  requestHash: string;
  startedAt: string;
}): ExecutionTrace {
  return {
    traceId: input.traceId,
    runId: input.traceId,
    agentId: input.agentId,
    requestedCapability: input.capability,
    tool: {
      toolId: input.resolvedTool.id,
      ensName: input.resolvedTool.ensName,
      manifestUri: input.resolvedTool.latestManifestUri,
      manifestHash: input.resolvedTool.latestManifestHash,
      version: input.resolvedTool.latestVersion,
      ownerAddress: input.resolvedTool.ownerAddress
    },
    discovery: {
      candidateCount: 1,
      capabilityIndexUri: `0g://indexes/capabilities/${input.capability}.json`,
      selectedReason: "selected by MCP capability call but rejected before invocation",
      resolvedAt: new Date().toISOString(),
      resolve: {
        ensName: input.resolvedTool.ensName,
        identityId: input.resolvedTool.id,
        manifestUri: input.resolvedTool.latestManifestUri,
        manifestHash: input.resolvedTool.latestManifestHash,
        version: input.resolvedTool.latestVersion,
        ownerAddress: input.resolvedTool.ownerAddress,
        evidence: `mcp/tools.call -> discover(${input.capability}) -> resolveIdentity(${input.resolvedTool.ensName}) -> loadManifest -> verifyManifest(rejected)`
      }
    },
    verification: {
      ...input.verification.checks,
      rejectedReason: input.verification.errors.join(", "),
      verifiedAt: new Date().toISOString()
    },
    invocation: {
      transport: "axl",
      peerId: input.manifest.invocation.axlPeerId,
      method: input.manifest.invocation.axlMethod,
      requestUri: input.requestUri,
      startedAt: input.startedAt,
      status: "rejected"
    },
    io: {
      inputHash: hashJson(input.input)
    },
    artifacts: [
      {
        kind: "invocation-request",
        uri: input.requestUri,
        hash: input.requestHash,
        mediaType: "application/json"
      }
    ],
    storage: {
      traceUri: "",
      persistedAt: new Date().toISOString(),
      backend: "0g-storage"
    }
  };
}
