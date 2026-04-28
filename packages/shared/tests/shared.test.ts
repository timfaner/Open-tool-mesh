import { describe, expect, it } from "vitest";
import type { ToolManifest } from "../src/index.js";

describe("shared contracts", () => {
  it("exposes manifest types with the expected version tag", () => {
    const manifest: ToolManifest = {
      schemaVersion: "otm.manifest.v1",
      toolId: "otm:ens:example.eth",
      name: "Example Tool",
      version: "0.1.0",
      description: "Example",
      owner: {
        address: "0x1234567890123456789012345678901234567890"
      },
      capabilities: [{ id: "solidity-static-analysis", description: "Example" }],
      mcp: {
        toolName: "example",
        protocol: "mcp-compatible",
        inputSchema: {},
        outputSchema: {}
      },
      invocation: {
        transport: "axl",
        axlPeerId: "peer",
        axlMethod: "invokeTool",
        timeoutMs: 1000
      },
      storage: {
        manifestUri: "0g://manifest.json",
        traceNamespace: "traces/example"
      },
      compatibility: {
        sdkVersionRange: "^0.1.0",
        manifestApiVersion: "v1"
      },
      integrity: {
        manifestHash: "sha256:test",
        createdAt: "2026-04-28T00:00:00.000Z"
      }
    };

    expect(manifest.schemaVersion).toBe("otm.manifest.v1");
  });
});

