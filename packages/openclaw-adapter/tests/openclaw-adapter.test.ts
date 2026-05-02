import { describe, expect, it } from "vitest";
import {
  createOpenClawTools,
  OPENCLAW_PLUGIN_MANIFEST,
  OTM_MCP_TOOL_CALL_CAPABILITY,
  OTM_MCP_TOOL_DISCOVER_TOOLS,
  OTM_MCP_TOOL_GET_TRACE,
  OTM_MCP_TOOL_PUBLISH_TOOL,
  OTM_MCP_TOOL_RESOLVE_TOOL,
  OTM_MCP_TOOL_SOLIDITY_STATIC_ANALYSIS,
  OTM_MCP_TOOL_VERIFY_TOOL
} from "../src/index.js";

const EXPECTED_TOOL_NAMES = [
  OTM_MCP_TOOL_CALL_CAPABILITY,
  OTM_MCP_TOOL_PUBLISH_TOOL,
  OTM_MCP_TOOL_DISCOVER_TOOLS,
  OTM_MCP_TOOL_RESOLVE_TOOL,
  OTM_MCP_TOOL_VERIFY_TOOL,
  OTM_MCP_TOOL_GET_TRACE,
  OTM_MCP_TOOL_SOLIDITY_STATIC_ANALYSIS
];

describe("OpenClaw adapter", () => {
  it("declares the OpenTool Mesh tools in plugin metadata", () => {
    expect(OPENCLAW_PLUGIN_MANIFEST.tools.map((tool) => tool.name)).toEqual(EXPECTED_TOOL_NAMES);
  });

  it("creates OpenClaw tool descriptors", () => {
    const tools = createOpenClawTools();

    expect(tools.map((tool) => tool.name)).toEqual(EXPECTED_TOOL_NAMES);
    expect(tools[0]?.inputSchema).toMatchObject({
      type: "object"
    });
  });
});
