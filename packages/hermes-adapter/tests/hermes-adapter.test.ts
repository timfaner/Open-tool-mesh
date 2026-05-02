import { describe, expect, it } from "vitest";
import {
  HERMES_OPENTOOL_MESH_SKILL,
  renderHermesSkillSummary
} from "../src/index.js";

describe("Hermes adapter", () => {
  it("declares the OpenTool Mesh skill metadata", () => {
    expect(HERMES_OPENTOOL_MESH_SKILL).toMatchObject({
      name: "opentool-mesh",
      path: "skills/opentool-mesh/SKILL.md"
    });
    expect(HERMES_OPENTOOL_MESH_SKILL.tools).toContain(
      "mcp_opentoolmesh_opentoolmesh_publish_tool"
    );
    expect(HERMES_OPENTOOL_MESH_SKILL.tools).toContain(
      "mcp_opentoolmesh_opentoolmesh_get_trace"
    );
    expect(HERMES_OPENTOOL_MESH_SKILL.tools).toContain("opentoolmesh_solidity_static_analysis");
  });

  it("renders a concise install summary", () => {
    expect(renderHermesSkillSummary()).toContain(
      "hermes skills install @opentoolmesh/hermes-adapter/opentool-mesh"
    );
  });
});
