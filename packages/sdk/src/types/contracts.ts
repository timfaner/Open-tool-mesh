import type {
  AuditReport,
  ExecutionTrace,
  ToolIdentity,
  ToolInvocationResponse,
  ToolManifest
} from "@opentoolmesh/shared";

export interface ResolveIdentityInput {
  ensName: string;
}

export interface DiscoverToolsInput {
  capability: string;
  versionRange?: string;
  limit?: number;
}

export interface DiscoveredTool extends ToolIdentity {
  manifestUri: string;
  manifestHash: string;
}

export interface LoadManifestInput {
  manifestUri: string;
}

export interface VerifyManifestInput {
  identity: ToolIdentity;
  manifest: ToolManifest;
  sdkVersion: string;
}

export interface ManifestVerificationResult {
  ok: boolean;
  toolId: string;
  checks: {
    manifestHashValid: boolean;
    ownerValid: boolean;
    schemaValid: boolean;
    versionCompatible: boolean;
  };
  errors: string[];
}

export interface InvokeToolInput<TInput = unknown> {
  capability: string;
  tool: ToolIdentity;
  manifest: ToolManifest;
  agentId: string;
  input: TInput;
  traceId: string;
}

export interface RecordTraceInput {
  trace: ExecutionTrace;
}

export interface RecordTraceResult {
  traceId: string;
  traceUri: string;
}

export interface SaveArtifactInput {
  namespace: string;
  artifact: unknown;
}

export interface SaveArtifactResult {
  uri: string;
  hash: string;
}

export interface PublishManifestInput {
  manifest: ToolManifest;
}

export interface PublishManifestResult {
  manifestUri: string;
  manifestHash: string;
  version: string;
}

export interface BuildAuditReportInput {
  findings: AuditReport["findings"];
  suggestedTests?: AuditReport["suggestedTests"];
  summary: string;
  contractName?: string;
}

export interface OpenToolMeshClient {
  resolveIdentity(input: ResolveIdentityInput): Promise<ToolIdentity>;
  discoverTools(input: DiscoverToolsInput): Promise<DiscoveredTool[]>;
  loadManifest(input: LoadManifestInput): Promise<ToolManifest>;
  verifyManifest(input: VerifyManifestInput): Promise<ManifestVerificationResult>;
  invokeTool<TInput, TOutput>(input: InvokeToolInput<TInput>): Promise<ToolInvocationResponse<TOutput>>;
  recordTrace(input: RecordTraceInput): Promise<RecordTraceResult>;
  saveArtifact(input: SaveArtifactInput): Promise<SaveArtifactResult>;
  publishManifest(input: PublishManifestInput): Promise<PublishManifestResult>;
  buildAuditReport(input: BuildAuditReportInput): Promise<AuditReport>;
}

