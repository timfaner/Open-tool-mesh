import {
  callOpenToolMeshCapability,
  discoverOpenToolMeshTools,
  getOpenToolMeshTrace,
  publishOpenToolMeshManifest,
  resolveOpenToolMeshTool,
  verifyOpenToolMeshTool
} from "./mesh-runner.js";
import type {
  DiscoverOpenToolMeshToolsRunner,
  GetOpenToolMeshTraceRunner,
  JsonRpcFailure,
  JsonRpcId,
  JsonRpcRequest,
  JsonRpcResponse,
  McpToolCallResult,
  McpToolDescriptor,
  OpenToolMeshCapabilityRunner,
  PublishOpenToolMeshManifestInput,
  PublishOpenToolMeshManifestRunner,
  ResolveOpenToolMeshToolRunner,
  VerifyOpenToolMeshToolRunner
} from "./types.js";

export const OTM_MCP_SERVER_NAME = "opentoolmesh-mcp";
export const OTM_MCP_PROTOCOL_VERSION = "2025-11-25";
export const OTM_MCP_TOOL_CALL_CAPABILITY = "opentoolmesh_call_capability";
export const OTM_MCP_TOOL_SOLIDITY_STATIC_ANALYSIS = "opentoolmesh_solidity_static_analysis";
export const OTM_MCP_TOOL_PUBLISH_TOOL = "opentoolmesh_publish_tool";
export const OTM_MCP_TOOL_DISCOVER_TOOLS = "opentoolmesh_discover_tools";
export const OTM_MCP_TOOL_RESOLVE_TOOL = "opentoolmesh_resolve_tool";
export const OTM_MCP_TOOL_VERIFY_TOOL = "opentoolmesh_verify_tool";
export const OTM_MCP_TOOL_GET_TRACE = "opentoolmesh_get_trace";

const TOOL_ANNOTATIONS = {
  readOnlyHint: false,
  destructiveHint: false,
  idempotentHint: false,
  openWorldHint: true
};

export const OPEN_TOOL_MESH_MCP_TOOLS: McpToolDescriptor[] = [
  {
    name: OTM_MCP_TOOL_CALL_CAPABILITY,
    title: "Call OpenTool Mesh Capability",
    description:
      "Discover, verify, invoke, and trace an OpenTool Mesh capability through the configured provider profile.",
    inputSchema: {
      type: "object",
      properties: {
        capability: {
          type: "string",
          description: "Capability id to discover, such as solidity-static-analysis."
        },
        input: {
          type: "object",
          description: "Input object validated against the selected tool manifest schema."
        },
        agentId: {
          type: "string",
          description: "Optional caller identity recorded in the execution trace."
        }
      },
      required: ["capability", "input"],
      additionalProperties: false
    },
    annotations: TOOL_ANNOTATIONS
  },
  {
    name: OTM_MCP_TOOL_PUBLISH_TOOL,
    title: "Publish OpenTool Mesh Tool",
    description:
      "Publish an OpenTool Mesh manifest and index its capabilities in the configured provider profile.",
    inputSchema: {
      type: "object",
      properties: {
        manifestPath: {
          type: "string",
          description: "Workspace-relative or absolute path to a ToolManifest JSON file."
        },
        manifest: {
          type: "object",
          description: "ToolManifest JSON object. Use this instead of manifestPath when the manifest is already loaded."
        }
      },
      additionalProperties: false
    },
    annotations: TOOL_ANNOTATIONS
  },
  {
    name: OTM_MCP_TOOL_DISCOVER_TOOLS,
    title: "Discover OpenTool Mesh Tools",
    description: "Discover OpenTool Mesh tools by capability id.",
    inputSchema: {
      type: "object",
      properties: {
        capability: {
          type: "string",
          description: "Capability id to query, such as solidity-static-analysis."
        },
        limit: {
          type: "number",
          description: "Optional maximum number of tools to return."
        }
      },
      required: ["capability"],
      additionalProperties: false
    },
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true
    }
  },
  {
    name: OTM_MCP_TOOL_RESOLVE_TOOL,
    title: "Resolve OpenTool Mesh Tool",
    description: "Resolve an ENS-style OpenTool Mesh tool identity and text records.",
    inputSchema: {
      type: "object",
      properties: {
        ensName: {
          type: "string",
          description: "Tool ENS name, such as solidity-scanner.auditagent.eth."
        }
      },
      required: ["ensName"],
      additionalProperties: false
    },
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true
    }
  },
  {
    name: OTM_MCP_TOOL_VERIFY_TOOL,
    title: "Verify OpenTool Mesh Tool",
    description: "Resolve a tool, load its manifest, and verify hash, owner, schema, and SDK compatibility.",
    inputSchema: {
      type: "object",
      properties: {
        ensName: {
          type: "string",
          description: "Tool ENS name to verify."
        },
        manifestUri: {
          type: "string",
          description: "Optional manifest URI override. Defaults to the identity latestManifestUri."
        },
        sdkVersion: {
          type: "string",
          description: "Optional SDK compatibility version. Defaults to 0.1.0."
        }
      },
      required: ["ensName"],
      additionalProperties: false
    },
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true
    }
  },
  {
    name: OTM_MCP_TOOL_GET_TRACE,
    title: "Get OpenTool Mesh Trace",
    description: "Load a persisted OpenTool Mesh execution trace by traceUri or local traceId.",
    inputSchema: {
      type: "object",
      properties: {
        traceUri: {
          type: "string",
          description: "Trace URI returned by a tool call, such as 0g://traces/<id>.json."
        },
        traceId: {
          type: "string",
          description: "Local trace id. Used as 0g://traces/<traceId>.json when traceUri is omitted."
        }
      },
      additionalProperties: false
    },
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true
    }
  },
  {
    name: OTM_MCP_TOOL_SOLIDITY_STATIC_ANALYSIS,
    title: "Run Solidity Static Analysis",
    description:
      "Run the OpenTool Mesh solidity-static-analysis capability and return findings plus trace references.",
    inputSchema: {
      type: "object",
      properties: {
        source: {
          type: "string",
          description: "Solidity source code to analyze."
        },
        agentId: {
          type: "string",
          description: "Optional caller identity recorded in the execution trace."
        }
      },
      required: ["source"],
      additionalProperties: false
    },
    annotations: TOOL_ANNOTATIONS
  }
];

export interface OpenToolMeshMcpHandlerOptions {
  runner?: OpenToolMeshCapabilityRunner;
  publishToolRunner?: PublishOpenToolMeshManifestRunner;
  discoverToolsRunner?: DiscoverOpenToolMeshToolsRunner;
  resolveToolRunner?: ResolveOpenToolMeshToolRunner;
  verifyToolRunner?: VerifyOpenToolMeshToolRunner;
  getTraceRunner?: GetOpenToolMeshTraceRunner;
  workspaceRoot?: string;
  agentId?: string;
  serverVersion?: string;
}

export interface OpenToolMeshMcpHandler {
  handleMessage(request: unknown): Promise<JsonRpcResponse | undefined>;
}

export function createOpenToolMeshMcpHandler(
  options: OpenToolMeshMcpHandlerOptions = {}
): OpenToolMeshMcpHandler {
  const runner = options.runner ?? callOpenToolMeshCapability;
  const publishToolRunner = options.publishToolRunner ?? publishOpenToolMeshManifest;
  const discoverToolsRunner = options.discoverToolsRunner ?? discoverOpenToolMeshTools;
  const resolveToolRunner = options.resolveToolRunner ?? resolveOpenToolMeshTool;
  const verifyToolRunner = options.verifyToolRunner ?? verifyOpenToolMeshTool;
  const getTraceRunner = options.getTraceRunner ?? getOpenToolMeshTrace;

  return {
    async handleMessage(request: unknown): Promise<JsonRpcResponse | undefined> {
      const id = getJsonRpcId(request);

      if (!isRecord(request)) {
        return jsonRpcError(id, -32600, "Invalid JSON-RPC request");
      }

      const rpcRequest = request as JsonRpcRequest;
      if (rpcRequest.jsonrpc !== undefined && rpcRequest.jsonrpc !== "2.0") {
        return jsonRpcError(id, -32600, "Invalid JSON-RPC version");
      }

      if (typeof rpcRequest.method !== "string") {
        return jsonRpcError(id, -32600, "Missing JSON-RPC method");
      }

      try {
        switch (rpcRequest.method) {
          case "initialize":
            return jsonRpcSuccess(id, {
              protocolVersion: selectProtocolVersion(rpcRequest.params),
              capabilities: {
                tools: {
                  listChanged: false
                }
              },
              serverInfo: {
                name: OTM_MCP_SERVER_NAME,
                version: options.serverVersion ?? "0.1.0"
              },
              instructions:
                "Use OpenTool Mesh tools when a task needs capability discovery, manifest verification, remote invocation, and trace persistence."
            });

          case "notifications/initialized":
            return undefined;

          case "ping":
            return jsonRpcSuccess(id, {});

          case "tools/list":
            return jsonRpcSuccess(id, {
              tools: OPEN_TOOL_MESH_MCP_TOOLS
            });

          case "tools/call":
            return jsonRpcSuccess(
              id,
              await callMcpTool(rpcRequest.params, runner, {
                workspaceRoot: options.workspaceRoot,
                agentId: options.agentId,
                publishToolRunner,
                discoverToolsRunner,
                resolveToolRunner,
                verifyToolRunner,
                getTraceRunner
              })
            );

          case "resources/list":
            return jsonRpcSuccess(id, { resources: [] });

          case "prompts/list":
            return jsonRpcSuccess(id, { prompts: [] });

          default:
            return jsonRpcError(id, -32601, `Method not found: ${rpcRequest.method}`);
        }
      } catch (error) {
        return jsonRpcError(id, -32000, error instanceof Error ? error.message : String(error));
      }
    }
  };
}

async function callMcpTool(
  params: unknown,
  runner: OpenToolMeshCapabilityRunner,
  defaults: {
    workspaceRoot?: string;
    agentId?: string;
    publishToolRunner: PublishOpenToolMeshManifestRunner;
    discoverToolsRunner: DiscoverOpenToolMeshToolsRunner;
    resolveToolRunner: ResolveOpenToolMeshToolRunner;
    verifyToolRunner: VerifyOpenToolMeshToolRunner;
    getTraceRunner: GetOpenToolMeshTraceRunner;
  }
): Promise<McpToolCallResult> {
  if (!isRecord(params) || typeof params.name !== "string") {
    throw new Error("tools/call requires params.name");
  }

  const args = isRecord(params.arguments) ? params.arguments : {};

  if (params.name === OTM_MCP_TOOL_CALL_CAPABILITY) {
    const capability = requireString(args.capability, "capability");
    const input = requireRecord(args.input, "input");
    const agentId = optionalString(args.agentId) ?? defaults.agentId;
    const result = await runner({
      capability,
      input,
      agentId,
      workspaceRoot: defaults.workspaceRoot
    });
    return toolResult(result);
  }

  if (params.name === OTM_MCP_TOOL_PUBLISH_TOOL) {
    const manifestPath = optionalString(args.manifestPath);
    const manifest = isRecord(args.manifest)
      ? (args.manifest as unknown as PublishOpenToolMeshManifestInput["manifest"])
      : undefined;
    const result = await defaults.publishToolRunner({
      manifestPath,
      manifest,
      workspaceRoot: defaults.workspaceRoot
    });
    return toolResult(result);
  }

  if (params.name === OTM_MCP_TOOL_DISCOVER_TOOLS) {
    const capability = requireString(args.capability, "capability");
    const result = await defaults.discoverToolsRunner({
      capability,
      limit: optionalInteger(args.limit),
      workspaceRoot: defaults.workspaceRoot
    });
    return toolResult(result);
  }

  if (params.name === OTM_MCP_TOOL_RESOLVE_TOOL) {
    const ensName = requireString(args.ensName, "ensName");
    const result = await defaults.resolveToolRunner({
      ensName,
      workspaceRoot: defaults.workspaceRoot
    });
    return toolResult(result);
  }

  if (params.name === OTM_MCP_TOOL_VERIFY_TOOL) {
    const ensName = requireString(args.ensName, "ensName");
    const result = await defaults.verifyToolRunner({
      ensName,
      manifestUri: optionalString(args.manifestUri),
      sdkVersion: optionalString(args.sdkVersion),
      workspaceRoot: defaults.workspaceRoot
    });
    return toolResult(result);
  }

  if (params.name === OTM_MCP_TOOL_GET_TRACE) {
    const result = await defaults.getTraceRunner({
      traceId: optionalString(args.traceId),
      traceUri: optionalString(args.traceUri),
      workspaceRoot: defaults.workspaceRoot
    });
    return toolResult(result);
  }

  if (params.name === OTM_MCP_TOOL_SOLIDITY_STATIC_ANALYSIS) {
    const source = requireString(args.source, "source");
    const agentId = optionalString(args.agentId) ?? defaults.agentId;
    const result = await runner({
      capability: "solidity-static-analysis",
      input: { source },
      agentId,
      workspaceRoot: defaults.workspaceRoot
    });
    return toolResult(result);
  }

  throw new Error(`Unknown OpenTool Mesh MCP tool: ${params.name}`);
}

function toolResult(result: unknown): McpToolCallResult {
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(result, null, 2)
      }
    ],
    structuredContent: result,
    isError:
      isRecord(result) &&
      result.status === "error"
  };
}

function selectProtocolVersion(params: unknown): string {
  if (isRecord(params) && typeof params.protocolVersion === "string") {
    return params.protocolVersion;
  }

  return OTM_MCP_PROTOCOL_VERSION;
}

function jsonRpcSuccess<T>(id: JsonRpcId, result: T): JsonRpcResponse<T> {
  return {
    jsonrpc: "2.0",
    id,
    result
  };
}

function jsonRpcError(id: JsonRpcId, code: number, message: string, data?: unknown): JsonRpcFailure {
  return {
    jsonrpc: "2.0",
    id,
    error: data === undefined ? { code, message } : { code, message, data }
  };
}

function getJsonRpcId(request: unknown): JsonRpcId {
  if (!isRecord(request)) {
    return null;
  }

  if (typeof request.id === "string" || typeof request.id === "number" || request.id === null) {
    return request.id;
  }

  return null;
}

function requireString(value: unknown, fieldName: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`tools/call argument ${fieldName} must be a non-empty string`);
  }

  return value;
}

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function optionalInteger(value: unknown): number | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (!Number.isInteger(value)) {
    throw new Error("tools/call argument limit must be an integer");
  }

  return value as number;
}

function requireRecord(value: unknown, fieldName: string): Record<string, unknown> {
  if (!isRecord(value)) {
    throw new Error(`tools/call argument ${fieldName} must be an object`);
  }

  return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
