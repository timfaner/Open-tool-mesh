import { describe, expect, it } from "vitest";
import {
  renderAgentInstallTemplate,
  renderAllAgentInstallTemplates
} from "../src/index.js";

describe("agent install templates", () => {
  it("renders Cursor stdio MCP config", () => {
    const template = renderAgentInstallTemplate({ target: "cursor" });

    expect(template.filename).toBe("cursor-mcp.json");
    expect(JSON.parse(template.content)).toEqual({
      mcpServers: {
        opentoolmesh: {
          command: "npx",
          args: ["-y", "@opentoolmesh/mcp-server", "--transport", "stdio"]
        }
      }
    });
  });

  it("renders remote Codex registration when a remote MCP URL is provided", () => {
    const template = renderAgentInstallTemplate({
      target: "codex",
      remoteUrl: "https://example.com/mcp"
    });

    expect(template.content).toBe("codex mcp add opentoolmesh --url https://example.com/mcp\n");
  });

  it("renders every supported target", () => {
    const templates = renderAllAgentInstallTemplates();

    expect(templates.map((template) => template.target)).toEqual([
      "codex",
      "claude-code",
      "cursor",
      "docker",
      "openclaw",
      "hermes"
    ]);
  });
});
