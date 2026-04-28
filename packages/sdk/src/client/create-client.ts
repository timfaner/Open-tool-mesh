import { randomUUID } from "node:crypto";
import type {
  AuditReport,
  CapabilityIndexEntry,
  ExecutionTrace,
  ToolIdentity,
  ToolInvocationRequest,
  ToolInvocationResponse,
  ToolManifest
} from "@opentoolmesh/shared";
import type {
  BuildAuditReportInput,
  DiscoverToolsInput,
  DiscoveredTool,
  InvokeToolInput,
  LoadManifestInput,
  ManifestVerificationResult,
  OpenToolMeshClient,
  PublishManifestInput,
  PublishManifestResult,
  RecordTraceInput,
  RecordTraceResult,
  ResolveIdentityInput,
  SaveArtifactInput,
  SaveArtifactResult,
  VerifyManifestInput
} from "../types/contracts.js";
import { hashJson, hashManifest } from "./local-devnet.js";

export interface EnsAdapter {
  resolveTextRecords(ensName: string): Promise<Record<string, string | undefined>>;
  resolveOwner(ensName: string): Promise<`0x${string}` | null>;
  setTextRecords?(ensName: string, records: Record<string, string>): Promise<void>;
}

export interface BlobStorageAdapter {
  putJson(namespace: string, value: unknown): Promise<{ uri: string; hash: string }>;
  getJson<T>(uri: string): Promise<T>;
}

export interface KvIndexAdapter {
  put(key: string, value: unknown): Promise<void>;
  get<T>(key: string): Promise<T | null>;
  listByPrefix?<T>(prefix: string): Promise<T[]>;
}

export interface InvocationTransport {
  invoke<TReq, TRes>(peerId: string, method: string, payload: TReq, timeoutMs: number): Promise<TRes>;
}

export interface OpenToolMeshClientDeps {
  ens: EnsAdapter;
  blob: BlobStorageAdapter;
  kv: KvIndexAdapter;
  transport: InvocationTransport;
}

export function createOpenToolMeshClient(_deps: OpenToolMeshClientDeps): OpenToolMeshClient {
  return {
    async resolveIdentity(input: ResolveIdentityInput): Promise<ToolIdentity> {
      const records = await _deps.ens.resolveTextRecords(input.ensName);
      const ownerAddress = await _deps.ens.resolveOwner(input.ensName);

      if (!ownerAddress) {
        throw new Error(`ENS identity not found: ${input.ensName}`);
      }

      return {
        id: `otm:ens:${input.ensName}`,
        ensName: input.ensName,
        ownerAddress,
        latestManifestUri: records["opentoolmesh.manifest_uri"] ?? "",
        latestManifestHash: records["opentoolmesh.manifest_hash"] ?? "",
        latestVersion: records["opentoolmesh.latest_version"] ?? "",
        capabilities: JSON.parse(records["opentoolmesh.capabilities"] ?? "[]") as string[]
      };
    },
    async discoverTools(input: DiscoverToolsInput): Promise<DiscoveredTool[]> {
      const entry = await _deps.kv.get<CapabilityIndexEntry>(`capability:${input.capability}`);
      if (!entry) {
        return [];
      }

      return entry.tools.slice(0, input.limit ?? entry.tools.length).map((tool) => ({
        id: tool.toolId,
        ensName: tool.ensName,
        ownerAddress: tool.ownerAddress,
        latestManifestUri: tool.manifestUri,
        latestManifestHash: tool.manifestHash,
        latestVersion: tool.version,
        capabilities: [entry.capability],
        manifestUri: tool.manifestUri,
        manifestHash: tool.manifestHash
      }));
    },
    async loadManifest(input: LoadManifestInput): Promise<ToolManifest> {
      return _deps.blob.getJson<ToolManifest>(input.manifestUri);
    },
    async verifyManifest(input: VerifyManifestInput): Promise<ManifestVerificationResult> {
      const errors: string[] = [];
      const manifestHashValid = hashManifest(input.manifest) === input.identity.latestManifestHash;
      const ownerValid =
        input.manifest.owner.address.toLowerCase() === input.identity.ownerAddress.toLowerCase();
      const schemaValid =
        input.manifest.schemaVersion === "otm.manifest.v1" &&
        input.manifest.mcp.protocol === "mcp-compatible" &&
        input.manifest.invocation.transport === "axl";
      const versionCompatible = input.manifest.compatibility.sdkVersionRange.startsWith("^0.1");

      if (!manifestHashValid) {
        errors.push("manifest hash mismatch");
      }
      if (!ownerValid) {
        errors.push("manifest owner does not match ENS owner");
      }
      if (!schemaValid) {
        errors.push("manifest schema is invalid");
      }
      if (!versionCompatible) {
        errors.push(`sdk version ${input.sdkVersion} is incompatible`);
      }

      return {
        ok: errors.length === 0,
        toolId: input.manifest.toolId,
        checks: {
          manifestHashValid,
          ownerValid,
          schemaValid,
          versionCompatible
        },
        errors
      };
    },
    async invokeTool<TInput, TOutput>(input: InvokeToolInput<TInput>): Promise<ToolInvocationResponse<TOutput>> {
      validateAgainstSchema(input.manifest.mcp.inputSchema, input.input, "input");

      const request: ToolInvocationRequest<TInput> = {
        requestId: randomUUID(),
        traceId: input.traceId,
        toolId: input.tool.id,
        capability: input.capability,
        manifestUri: input.tool.latestManifestUri,
        manifestHash: input.tool.latestManifestHash,
        caller: {
          agentId: input.agentId
        },
        input: input.input,
        inputHash: hashJson(input.input),
        sentAt: new Date().toISOString()
      };

      const envelope = {
        kind: "otm.tool.invoke" as const,
        request
      };

      const result = await _deps.transport.invoke<typeof envelope, { kind: "otm.tool.result"; response: ToolInvocationResponse<TOutput> }>(
        input.manifest.invocation.axlPeerId,
        input.manifest.invocation.axlMethod,
        envelope,
        input.manifest.invocation.timeoutMs
      );

      if (result.kind !== "otm.tool.result") {
        throw new Error("Unexpected invocation response envelope");
      }

      if (result.response.status === "ok" && result.response.output !== undefined) {
        validateAgainstSchema(input.manifest.mcp.outputSchema, result.response.output, "output");
      }

      return result.response;
    },
    async recordTrace(input: RecordTraceInput): Promise<RecordTraceResult> {
      const stored = await _deps.blob.putJson("traces", input.trace);
      const summary = buildTraceSummary(input.trace, stored.uri);
      await _deps.kv.put(`trace:${input.trace.traceId}`, summary);
      return {
        traceId: input.trace.traceId,
        traceUri: stored.uri
      };
    },
    async saveArtifact(input: SaveArtifactInput): Promise<SaveArtifactResult> {
      return _deps.blob.putJson(input.namespace, input.artifact);
    },
    async publishManifest(input: PublishManifestInput): Promise<PublishManifestResult> {
      const storedManifest = structuredClone(input.manifest);
      const persisted = await _deps.blob.putJson("manifests", storedManifest);
      storedManifest.storage.manifestUri = persisted.uri;
      storedManifest.integrity.manifestHash = hashManifest(storedManifest);
      await _deps.blob.putJson("manifests", storedManifest);
      await _deps.ens.setTextRecords?.(storedManifest.owner.ensName ?? storedManifest.toolId.replace("otm:ens:", ""), {
        "opentoolmesh.manifest_uri": storedManifest.storage.manifestUri,
        "opentoolmesh.manifest_hash": storedManifest.integrity.manifestHash,
        "opentoolmesh.owner": storedManifest.owner.address,
        "opentoolmesh.latest_version": storedManifest.version,
        "opentoolmesh.capabilities": JSON.stringify(storedManifest.capabilities.map((capability) => capability.id))
      });
      return {
        manifestUri: storedManifest.storage.manifestUri,
        manifestHash: storedManifest.integrity.manifestHash,
        version: storedManifest.version
      };
    },
    async buildAuditReport(input: BuildAuditReportInput): Promise<AuditReport> {
      return {
        reportId: `report_${Date.now()}`,
        contractName: input.contractName,
        summary: input.summary,
        findings: input.findings,
        suggestedTests: input.suggestedTests,
        generatedAt: new Date().toISOString()
      };
    }
  };
}

function buildTraceSummary(trace: ExecutionTrace, traceUri: string) {
  return {
    traceId: trace.traceId,
    requestedCapability: trace.requestedCapability,
    tool: {
      toolId: trace.tool.toolId,
      ensName: trace.tool.ensName,
      manifestUri: trace.tool.manifestUri,
      manifestHash: trace.tool.manifestHash,
      version: trace.tool.version
    },
    verification: trace.verification,
    invocation: {
      peerId: trace.invocation.peerId,
      status: trace.invocation.status
    },
    io: trace.io,
    storage: {
      traceUri
    }
  };
}

function validateAgainstSchema(schema: Record<string, unknown>, payload: unknown, label: string) {
  if (schema.type !== "object" || typeof payload !== "object" || payload === null || Array.isArray(payload)) {
    throw new Error(`${label} must be an object`);
  }

  const required = Array.isArray(schema.required) ? schema.required : [];
  const properties =
    typeof schema.properties === "object" && schema.properties !== null
      ? (schema.properties as Record<string, Record<string, unknown>>)
      : {};

  for (const field of required) {
    if (!(field in (payload as Record<string, unknown>))) {
      throw new Error(`${label} missing required field: ${field}`);
    }
  }

  for (const [field, definition] of Object.entries(properties)) {
    const value = (payload as Record<string, unknown>)[field];
    if (value === undefined || !definition.type) {
      continue;
    }

    const matches =
      (definition.type === "string" && typeof value === "string") ||
      (definition.type === "number" && typeof value === "number") ||
      (definition.type === "boolean" && typeof value === "boolean") ||
      (definition.type === "array" && Array.isArray(value)) ||
      (definition.type === "object" && typeof value === "object" && value !== null && !Array.isArray(value));

    if (!matches) {
      throw new Error(`${label}.${field} must be ${definition.type}`);
    }
  }
}
