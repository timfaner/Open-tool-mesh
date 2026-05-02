export interface HermesSkillMetadata {
  name: string;
  description: string;
  path: string;
  tools: string[];
  installCommand: string;
}

export const HERMES_OPENTOOL_MESH_SKILL: HermesSkillMetadata = {
  name: "opentool-mesh",
  description:
    "Use OpenTool Mesh MCP tools for auditable capability discovery, manifest verification, invocation, and trace persistence.",
  path: "skills/opentool-mesh/SKILL.md",
  tools: [
    "mcp_opentoolmesh_opentoolmesh_publish_tool",
    "mcp_opentoolmesh_opentoolmesh_discover_tools",
    "mcp_opentoolmesh_opentoolmesh_resolve_tool",
    "mcp_opentoolmesh_opentoolmesh_verify_tool",
    "mcp_opentoolmesh_opentoolmesh_get_trace",
    "mcp_opentoolmesh_opentoolmesh_call_capability",
    "mcp_opentoolmesh_opentoolmesh_solidity_static_analysis",
    "opentoolmesh_publish_tool",
    "opentoolmesh_discover_tools",
    "opentoolmesh_resolve_tool",
    "opentoolmesh_verify_tool",
    "opentoolmesh_get_trace",
    "opentoolmesh_call_capability",
    "opentoolmesh_solidity_static_analysis"
  ],
  installCommand: "hermes skills install @opentoolmesh/hermes-adapter/opentool-mesh"
};

export function renderHermesSkillSummary(metadata: HermesSkillMetadata = HERMES_OPENTOOL_MESH_SKILL): string {
  return [
    `${metadata.name}: ${metadata.description}`,
    `Install: ${metadata.installCommand}`,
    `Skill file: ${metadata.path}`,
    `Tools: ${metadata.tools.join(", ")}`
  ].join("\n");
}
