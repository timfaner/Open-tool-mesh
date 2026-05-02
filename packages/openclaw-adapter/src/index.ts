import {
  callOpenToolMeshCapability,
  discoverOpenToolMeshTools,
  getOpenToolMeshTrace,
  OPEN_TOOL_MESH_MCP_TOOLS,
  publishOpenToolMeshManifest,
  resolveOpenToolMeshTool,
  verifyOpenToolMeshTool,
  OTM_MCP_TOOL_CALL_CAPABILITY,
  OTM_MCP_TOOL_DISCOVER_TOOLS,
  OTM_MCP_TOOL_GET_TRACE,
  OTM_MCP_TOOL_PUBLISH_TOOL,
  OTM_MCP_TOOL_RESOLVE_TOOL,
  OTM_MCP_TOOL_SOLIDITY_STATIC_ANALYSIS,
  OTM_MCP_TOOL_VERIFY_TOOL
} from "@opentoolmesh/mcp-server";
import type { PublishOpenToolMeshManifestInput } from "@opentoolmesh/mcp-server";

export {
  OTM_MCP_TOOL_CALL_CAPABILITY,
  OTM_MCP_TOOL_DISCOVER_TOOLS,
  OTM_MCP_TOOL_GET_TRACE,
  OTM_MCP_TOOL_PUBLISH_TOOL,
  OTM_MCP_TOOL_RESOLVE_TOOL,
  OTM_MCP_TOOL_SOLIDITY_STATIC_ANALYSIS,
  OTM_MCP_TOOL_VERIFY_TOOL
} from "@opentoolmesh/mcp-server";

export interface OpenClawToolRuntime {
  registerTool(tool: OpenClawTool): void | Promise<void>;
}

export interface OpenClawTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  execute(input: Record<string, unknown>): Promise<unknown>;
}

export interface OpenClawAdapterOptions {
  workspaceRoot?: string;
  agentId?: string;
}

export const OPENCLAW_PLUGIN_MANIFEST = {
  name: "@opentoolmesh/openclaw-adapter",
  version: "0.1.0",
  description:
    "OpenClaw adapter for OpenTool Mesh capability discovery, manifest verification, invocation, and trace persistence.",
  tools: OPEN_TOOL_MESH_MCP_TOOLS.map((tool) => ({
    name: tool.name,
    description: tool.description,
    inputSchema: tool.inputSchema
  })),
  skills: ["skills/opentool-mesh/SKILL.md"]
} as const;

export function createOpenClawTools(options: OpenClawAdapterOptions = {}): OpenClawTool[] {
  return [
    {
      name: OTM_MCP_TOOL_CALL_CAPABILITY,
      description:
        "Discover, verify, invoke, and trace an OpenTool Mesh capability from OpenClaw.",
      inputSchema: getInputSchema(OTM_MCP_TOOL_CALL_CAPABILITY),
      async execute(input) {
        const capability = requireString(input.capability, "capability");
        const toolInput = requireRecord(input.input, "input");
        return callOpenToolMeshCapability({
          capability,
          input: toolInput,
          workspaceRoot: options.workspaceRoot,
          agentId: optionalString(input.agentId) ?? options.agentId ?? "openclaw-opentoolmesh"
        });
      }
    },
    {
      name: OTM_MCP_TOOL_PUBLISH_TOOL,
      description: "Publish an OpenTool Mesh manifest and index its capabilities.",
      inputSchema: getInputSchema(OTM_MCP_TOOL_PUBLISH_TOOL),
      async execute(input) {
        return publishOpenToolMeshManifest({
          manifestPath: optionalString(input.manifestPath),
          manifest: isRecord(input.manifest)
            ? (input.manifest as unknown as PublishOpenToolMeshManifestInput["manifest"])
            : undefined,
          workspaceRoot: options.workspaceRoot
        });
      }
    },
    {
      name: OTM_MCP_TOOL_DISCOVER_TOOLS,
      description: "Discover OpenTool Mesh tools by capability.",
      inputSchema: getInputSchema(OTM_MCP_TOOL_DISCOVER_TOOLS),
      async execute(input) {
        return discoverOpenToolMeshTools({
          capability: requireString(input.capability, "capability"),
          limit: optionalInteger(input.limit),
          workspaceRoot: options.workspaceRoot
        });
      }
    },
    {
      name: OTM_MCP_TOOL_RESOLVE_TOOL,
      description: "Resolve an OpenTool Mesh tool identity by ENS name.",
      inputSchema: getInputSchema(OTM_MCP_TOOL_RESOLVE_TOOL),
      async execute(input) {
        return resolveOpenToolMeshTool({
          ensName: requireString(input.ensName, "ensName"),
          workspaceRoot: options.workspaceRoot
        });
      }
    },
    {
      name: OTM_MCP_TOOL_VERIFY_TOOL,
      description: "Verify an OpenTool Mesh tool manifest.",
      inputSchema: getInputSchema(OTM_MCP_TOOL_VERIFY_TOOL),
      async execute(input) {
        return verifyOpenToolMeshTool({
          ensName: requireString(input.ensName, "ensName"),
          manifestUri: optionalString(input.manifestUri),
          sdkVersion: optionalString(input.sdkVersion),
          workspaceRoot: options.workspaceRoot
        });
      }
    },
    {
      name: OTM_MCP_TOOL_GET_TRACE,
      description: "Load an OpenTool Mesh execution trace.",
      inputSchema: getInputSchema(OTM_MCP_TOOL_GET_TRACE),
      async execute(input) {
        return getOpenToolMeshTrace({
          traceId: optionalString(input.traceId),
          traceUri: optionalString(input.traceUri),
          workspaceRoot: options.workspaceRoot
        });
      }
    },
    {
      name: OTM_MCP_TOOL_SOLIDITY_STATIC_ANALYSIS,
      description:
        "Run the OpenTool Mesh solidity-static-analysis capability from OpenClaw.",
      inputSchema: getInputSchema(OTM_MCP_TOOL_SOLIDITY_STATIC_ANALYSIS),
      async execute(input) {
        return callOpenToolMeshCapability({
          capability: "solidity-static-analysis",
          input: {
            source: requireString(input.source, "source")
          },
          workspaceRoot: options.workspaceRoot,
          agentId: optionalString(input.agentId) ?? options.agentId ?? "openclaw-opentoolmesh"
        });
      }
    }
  ];
}

export async function registerOpenToolMeshOpenClawPlugin(
  runtime: OpenClawToolRuntime,
  options: OpenClawAdapterOptions = {}
): Promise<void> {
  for (const tool of createOpenClawTools(options)) {
    await runtime.registerTool(tool);
  }
}

function requireString(value: unknown, fieldName: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`OpenClaw OpenTool Mesh argument ${fieldName} must be a non-empty string`);
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
    throw new Error("OpenClaw OpenTool Mesh argument limit must be an integer");
  }

  return value as number;
}

function requireRecord(value: unknown, fieldName: string): Record<string, unknown> {
  if (!isRecord(value)) {
    throw new Error(`OpenClaw OpenTool Mesh argument ${fieldName} must be an object`);
  }

  return value;
}

function getInputSchema(toolName: string): Record<string, unknown> {
  return OPEN_TOOL_MESH_MCP_TOOLS.find((tool) => tool.name === toolName)?.inputSchema ?? {};
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
