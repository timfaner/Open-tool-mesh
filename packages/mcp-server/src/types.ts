import type { DiscoveredTool, ManifestVerificationResult, PublishManifestResult } from "@opentoolmesh/sdk";
import type { ExecutionTrace, ToolIdentity, ToolInvocationResponse, ToolManifest } from "@opentoolmesh/shared";

export type JsonRpcId = string | number | null;

export interface JsonRpcRequest {
  jsonrpc?: "2.0";
  id?: JsonRpcId;
  method?: string;
  params?: unknown;
}

export interface JsonRpcSuccess<T = unknown> {
  jsonrpc: "2.0";
  id: JsonRpcId;
  result: T;
}

export interface JsonRpcFailure {
  jsonrpc: "2.0";
  id: JsonRpcId;
  error: {
    code: number;
    message: string;
    data?: unknown;
  };
}

export type JsonRpcResponse<T = unknown> = JsonRpcSuccess<T> | JsonRpcFailure;

export interface McpToolDescriptor {
  name: string;
  title?: string;
  description: string;
  inputSchema: Record<string, unknown>;
  outputSchema?: Record<string, unknown>;
  annotations?: Record<string, unknown>;
}

export interface McpContentItem {
  type: "text";
  text: string;
}

export interface McpToolCallResult {
  content: McpContentItem[];
  structuredContent?: unknown;
  isError?: boolean;
}

export interface CallOpenToolMeshCapabilityInput {
  capability: string;
  input: Record<string, unknown>;
  agentId?: string;
  workspaceRoot?: string;
  sdkVersion?: string;
}

export interface PublishOpenToolMeshManifestInput {
  manifestPath?: string;
  manifest?: ToolManifest;
  workspaceRoot?: string;
}

export interface PublishOpenToolMeshManifestResult {
  toolId: string;
  manifestUri: string;
  manifestHash: string;
  version: string;
  capabilities: string[];
  providerProfile: string;
  published: PublishManifestResult;
}

export interface DiscoverOpenToolMeshToolsInput {
  capability: string;
  limit?: number;
  workspaceRoot?: string;
}

export interface DiscoverOpenToolMeshToolsResult {
  capability: string;
  count: number;
  tools: DiscoveredTool[];
}

export interface ResolveOpenToolMeshToolInput {
  ensName: string;
  workspaceRoot?: string;
}

export interface ResolveOpenToolMeshToolResult {
  identity: ToolIdentity;
}

export interface VerifyOpenToolMeshToolInput {
  ensName: string;
  manifestUri?: string;
  sdkVersion?: string;
  workspaceRoot?: string;
}

export interface VerifyOpenToolMeshToolResult {
  identity: ToolIdentity;
  manifest: ToolManifest;
  verification: ManifestVerificationResult;
}

export interface GetOpenToolMeshTraceInput {
  traceId?: string;
  traceUri?: string;
  workspaceRoot?: string;
}

export interface GetOpenToolMeshTraceResult {
  traceId: string;
  traceUri: string;
  trace: ExecutionTrace;
}

export interface OpenToolMeshCapabilityCallResult {
  capability: string;
  agentId: string;
  status: "ok" | "error";
  output?: unknown;
  error?: {
    code: string;
    message: string;
    retriable?: boolean;
  };
  tool: {
    toolId: string;
    ensName: string;
    manifestUri: string;
    manifestHash: string;
    version: string;
    ownerAddress: string;
  };
  verification: ManifestVerificationResult;
  traceId: string;
  traceUri: string;
  artifacts: {
    requestUri: string;
    responseUri: string;
    outputUri?: string;
  };
  response: ToolInvocationResponse<unknown>;
}

export type OpenToolMeshCapabilityRunner = (
  input: CallOpenToolMeshCapabilityInput
) => Promise<OpenToolMeshCapabilityCallResult>;

export type PublishOpenToolMeshManifestRunner = (
  input: PublishOpenToolMeshManifestInput
) => Promise<PublishOpenToolMeshManifestResult>;

export type DiscoverOpenToolMeshToolsRunner = (
  input: DiscoverOpenToolMeshToolsInput
) => Promise<DiscoverOpenToolMeshToolsResult>;

export type ResolveOpenToolMeshToolRunner = (
  input: ResolveOpenToolMeshToolInput
) => Promise<ResolveOpenToolMeshToolResult>;

export type VerifyOpenToolMeshToolRunner = (
  input: VerifyOpenToolMeshToolInput
) => Promise<VerifyOpenToolMeshToolResult>;

export type GetOpenToolMeshTraceRunner = (
  input: GetOpenToolMeshTraceInput
) => Promise<GetOpenToolMeshTraceResult>;
