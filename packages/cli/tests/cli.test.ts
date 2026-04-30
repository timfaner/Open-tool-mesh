import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { runCallCommand } from "../src/commands/call.js";
import type { OpenToolMeshClient } from "@opentoolmesh/sdk";
import type { ToolIdentity, ToolManifest } from "@opentoolmesh/shared";

const traceId1 = "11111111-1111-1111-1111-111111111111";
const traceId2 = "22222222-2222-2222-2222-222222222222";

function createIdentity(): ToolIdentity {
  return {
    id: "otm:ens:tool.eth",
    ensName: "tool.eth",
    latestManifestUri: "0g://manifests/tool.json",
    latestManifestHash: "sha256:abc",
    latestVersion: "0.1.0",
    ownerAddress: "0x1234567890abcdef1234567890abcdef12345678",
    capabilities: ["solidity-static-analysis"]
  };
}

function createManifest(identity: ToolIdentity): ToolManifest {
  return {
    schemaVersion: "otm.manifest.v1",
    toolId: identity.id,
    name: "Scanner",
    version: "0.1.0",
    description: "Scan solidity",
    owner: {
      address: identity.ownerAddress,
      signature: "sig"
    },
    capabilities: [{ id: "solidity-static-analysis", description: "scan" }],
    mcp: {
      toolName: "scanner",
      protocol: "mcp-compatible",
      inputSchema: { type: "object", required: ["source"], properties: { source: { type: "string" } } },
      outputSchema: { type: "object", properties: {} }
    },
    invocation: {
      transport: "axl",
      axlPeerId: "peer-1",
      axlMethod: "invokeTool",
      timeoutMs: 10_000
    },
    storage: {
      manifestUri: identity.latestManifestUri,
      traceNamespace: "traces"
    },
    compatibility: {
      sdkVersionRange: "^0.1.0",
      manifestApiVersion: "v1"
    },
    integrity: {
      manifestHash: identity.latestManifestHash,
      createdAt: "2026-04-28T15:00:00.000Z"
    }
  };
}

describe("cli skeleton", () => {
  it("registers the trace command in the entrypoint", () => {
    const source = readFileSync(new URL("../src/index.ts", import.meta.url), "utf8");
    expect(source).toContain("trace");
    expect(source).toContain("verify");
  });

  it("verifies manifest before remote invocation", async () => {
    const events: string[] = [];
    const identity = createIdentity();
    const manifest = createManifest(identity);

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
          requestId: "req-1",
          traceId: traceId1,
          toolId: identity.id,
          status: "ok" as const,
          output: { ok: true },
          finishedAt: "2026-04-28T15:10:01.000Z"
        };
      }),
      saveArtifact: vi
        .fn()
        .mockResolvedValueOnce({ uri: "0g://artifacts/request.json", hash: "sha256:req" })
        .mockResolvedValueOnce({ uri: "0g://artifacts/response.json", hash: "sha256:res" })
        .mockResolvedValueOnce({ uri: "0g://artifacts/1.json", hash: "sha256:out" }),
      recordTrace: vi.fn().mockResolvedValueOnce({ traceId: traceId1, traceUri: "0g://traces/1.json" }),
      discoverTools: vi.fn(),
      publishManifest: vi.fn(),
      buildAuditReport: vi.fn()
    };
    const stdout = { log: vi.fn(), error: vi.fn() };

    await runCallCommand(["--tool", "tool.eth", "--input", "input.json"], { cwd: "/tmp", stdout }, {
      createCliClient: async () => ({ client: client as unknown as OpenToolMeshClient, rootDir: "/tmp" }),
      readJsonFromFile: async <T>() => ({ source: "contract Vault {}" } as T),
      readFile: readFileSync as never,
      randomUUID: () => traceId1,
      now: () => "2026-04-28T15:10:00.000Z"
    });

    expect(events).toEqual(["resolve", "load", "verify", "invoke"]);
    expect(client.recordTrace).toHaveBeenCalled();
    const firstCall = client.recordTrace.mock.calls[0];
    expect(firstCall).toBeDefined();
    const trace = firstCall![0].trace;
    expect(trace.requestedCapability).toBe("solidity-static-analysis");
    expect(trace.invocation.startedAt).toBe("2026-04-28T15:10:00.000Z");
    expect(trace.invocation.finishedAt).toBe("2026-04-28T15:10:01.000Z");
    expect(trace.invocation.requestUri).toBe("0g://artifacts/request.json");
    expect(trace.invocation.responseUri).toBe("0g://artifacts/response.json");
  });

  it("rejects remote invocation when verification fails", async () => {
    const identity = createIdentity();
    const manifest = createManifest(identity);
    const client = {
      resolveIdentity: vi.fn(async () => identity),
      loadManifest: vi.fn(async () => manifest),
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
      recordTrace: vi.fn().mockResolvedValueOnce({ traceId: traceId2, traceUri: "0g://traces/2.json" }),
      discoverTools: vi.fn(),
      publishManifest: vi.fn(),
      buildAuditReport: vi.fn()
    };
    const stdout = { log: vi.fn(), error: vi.fn() };

    await runCallCommand(["--tool", "tool.eth", "--input", "input.json"], { cwd: "/tmp", stdout }, {
      createCliClient: async () => ({ client: client as unknown as OpenToolMeshClient, rootDir: "/tmp" }),
      readJsonFromFile: async <T>() => ({ source: "contract Vault {}" } as T),
      readFile: readFileSync as never,
      randomUUID: () => traceId2,
      now: () => "2026-04-28T15:20:00.000Z"
    });

    expect(client.invokeTool).not.toHaveBeenCalled();
    const firstCall = client.recordTrace.mock.calls[0];
    expect(firstCall).toBeDefined();
    const trace = firstCall![0].trace;
    expect(trace.invocation.status).toBe("rejected");
    expect(trace.verification.rejectedReason).toBe("manifest hash mismatch");
  });

  it("discovers a tool by capability before resolve and call", async () => {
    const events: string[] = [];
    const identity = createIdentity();
    const manifest = createManifest(identity);
    const client = {
      discoverTools: vi.fn(async () => {
        events.push("discover");
        return [
          {
            ...identity,
            manifestUri: identity.latestManifestUri,
            manifestHash: identity.latestManifestHash
          }
        ];
      }),
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
          requestId: "req-2",
          traceId: traceId1,
          toolId: identity.id,
          status: "ok" as const,
          output: { ok: true },
          finishedAt: "2026-04-28T15:10:01.000Z"
        };
      }),
      saveArtifact: vi
        .fn()
        .mockResolvedValueOnce({ uri: "0g://artifacts/request.json", hash: "sha256:req" })
        .mockResolvedValueOnce({ uri: "0g://artifacts/response.json", hash: "sha256:res" })
        .mockResolvedValueOnce({ uri: "0g://artifacts/output.json", hash: "sha256:out" }),
      recordTrace: vi.fn().mockResolvedValueOnce({ traceId: traceId1, traceUri: "0g://traces/1.json" }),
      publishManifest: vi.fn(),
      buildAuditReport: vi.fn()
    };
    const stdout = { log: vi.fn(), error: vi.fn() };

    await runCallCommand(["--capability", "solidity-static-analysis", "--input", "input.json"], { cwd: "/tmp", stdout }, {
      createCliClient: async () => ({ client: client as unknown as OpenToolMeshClient, rootDir: "/tmp" }),
      readJsonFromFile: async <T>() => ({ source: "contract Vault {}" } as T),
      readFile: readFileSync as never,
      randomUUID: () => traceId1,
      now: () => "2026-04-28T15:10:00.000Z"
    });

    expect(events).toEqual(["discover", "resolve", "load", "verify", "invoke"]);
    const trace = client.recordTrace.mock.calls[0]?.[0].trace;
    expect(trace.discovery.candidateCount).toBe(1);
    expect(trace.discovery.resolve?.evidence).toContain("discover(solidity-static-analysis)");
  });
});
