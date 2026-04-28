import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { runCallCommand } from "../src/commands/call.js";
import type { ToolIdentity, ToolManifest } from "@opentoolmesh/shared";

describe("cli skeleton", () => {
  it("registers the trace command in the entrypoint", () => {
    const source = readFileSync(new URL("../src/index.ts", import.meta.url), "utf8");
    expect(source).toContain("trace");
  });

  it("verifies manifest before remote invocation", async () => {
    const events: string[] = [];
    const identity: ToolIdentity = {
      id: "otm:ens:tool.eth",
      ensName: "tool.eth",
      latestManifestUri: "0g://manifests/tool.json",
      latestManifestHash: "sha256:abc",
      latestVersion: "0.1.0",
      ownerAddress: "0x1234567890abcdef1234567890abcdef12345678"
    };
    const manifest: ToolManifest = {
      toolId: identity.id,
      version: "0.1.0",
      owner: {
        address: identity.ownerAddress,
        signature: "sig"
      },
      capabilities: [{ id: "solidity-static-analysis", description: "scan" }],
      schemas: {
        input: { type: "object", required: ["source"], properties: { source: { type: "string" } } },
        output: { type: "object", properties: {} }
      },
      invocation: {
        transport: "axl",
        axlPeerId: "peer-1",
        axlMethod: "invokeTool"
      },
      storage: {
        manifestUri: identity.latestManifestUri
      },
      integrity: {
        manifestHash: identity.latestManifestHash
      }
    };

    const client = {
      resolveIdentity: vi.fn(async () => {
        events.push("resolve");
        return identity;
      }),
      loadManifest: vi.fn(async () => {
        events.push("load");
        return manifest;
      }),
      verifyManifest: vi.fn(async () => {
        events.push("verify");
        return {
          ok: true,
          toolId: identity.id,
          checks: {
            manifestHashValid: true,
            ownerValid: true,
            schemaValid: true,
            versionCompatible: true
          },
          errors: []
        };
      }),
      invokeTool: vi.fn(async () => {
        events.push("invoke");
        return {
          status: "ok" as const,
          output: { ok: true },
          finishedAt: "2026-04-28T15:10:01.000Z"
        };
      }),
      saveArtifact: vi.fn(async () => ({ uri: "0g://artifacts/1.json", hash: "sha256:out" })),
      recordTrace: vi
        .fn()
        .mockResolvedValueOnce({ traceId: "trace-1", traceUri: "0g://traces/1.json" })
        .mockResolvedValueOnce({ traceId: "trace-1", traceUri: "0g://traces/1.json" })
    };
    const stdout = { log: vi.fn(), error: vi.fn() };

    await runCallCommand(["--tool", "tool.eth", "--input", "input.json"], { cwd: "/tmp", stdout }, {
      createCliClient: async () => ({ client, rootDir: "/tmp" }),
      readJsonFromFile: async () => ({ source: "contract Vault {}" }),
      readFile: readFileSync as never,
      randomUUID: () => "trace-1",
      now: () => "2026-04-28T15:10:00.000Z"
    });

    expect(events).toEqual(["resolve", "load", "verify", "invoke"]);
    expect(client.recordTrace).toHaveBeenCalled();
    const trace = client.recordTrace.mock.calls[0][0].trace;
    expect(trace.invocation.startedAt).toBe("2026-04-28T15:10:00.000Z");
    expect(trace.invocation.finishedAt).toBe("2026-04-28T15:10:01.000Z");
  });

  it("rejects remote invocation when verification fails", async () => {
    const client = {
      resolveIdentity: vi.fn(async () => ({
        id: "otm:ens:tool.eth",
        ensName: "tool.eth",
        latestManifestUri: "0g://manifests/tool.json",
        latestManifestHash: "sha256:abc",
        latestVersion: "0.1.0",
        ownerAddress: "0x1234567890abcdef1234567890abcdef12345678"
      })),
      loadManifest: vi.fn(async () => ({
        toolId: "otm:ens:tool.eth",
        version: "0.1.0",
        owner: {
          address: "0x1234567890abcdef1234567890abcdef12345678",
          signature: "sig"
        },
        capabilities: [{ id: "solidity-static-analysis", description: "scan" }],
        schemas: {
          input: { type: "object", required: ["source"], properties: { source: { type: "string" } } },
          output: { type: "object", properties: {} }
        },
        invocation: {
          transport: "axl",
          axlPeerId: "peer-1",
          axlMethod: "invokeTool"
        },
        storage: {
          manifestUri: "0g://manifests/tool.json"
        },
        integrity: {
          manifestHash: "sha256:abc"
        }
      })),
      verifyManifest: vi.fn(async () => ({
        ok: false,
        toolId: "otm:ens:tool.eth",
        checks: {
          manifestHashValid: false,
          ownerValid: true,
          schemaValid: true,
          versionCompatible: true
        },
        errors: ["manifest hash mismatch"]
      })),
      invokeTool: vi.fn(),
      saveArtifact: vi.fn(),
      recordTrace: vi
        .fn()
        .mockResolvedValueOnce({ traceId: "trace-2", traceUri: "0g://traces/2.json" })
        .mockResolvedValueOnce({ traceId: "trace-2", traceUri: "0g://traces/2.json" })
    };
    const stdout = { log: vi.fn(), error: vi.fn() };

    await runCallCommand(["--tool", "tool.eth", "--input", "input.json"], { cwd: "/tmp", stdout }, {
      createCliClient: async () => ({ client, rootDir: "/tmp" }),
      readJsonFromFile: async () => ({ source: "contract Vault {}" }),
      readFile: readFileSync as never,
      randomUUID: () => "trace-2",
      now: () => "2026-04-28T15:20:00.000Z"
    });

    expect(client.invokeTool).not.toHaveBeenCalled();
    const trace = client.recordTrace.mock.calls[0][0].trace;
    expect(trace.invocation.status).toBe("rejected");
    expect(trace.verification.rejectedReason).toBe("manifest hash mismatch");
  });
});
