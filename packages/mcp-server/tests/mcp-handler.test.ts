import { describe, expect, it } from "vitest";
import {
  createOpenToolMeshMcpHandler,
  OTM_MCP_TOOL_DISCOVER_TOOLS,
  OTM_MCP_TOOL_GET_TRACE,
  OTM_MCP_TOOL_PUBLISH_TOOL,
  OTM_MCP_TOOL_RESOLVE_TOOL,
  OTM_MCP_SERVER_NAME,
  OTM_MCP_TOOL_CALL_CAPABILITY,
  OTM_MCP_TOOL_SOLIDITY_STATIC_ANALYSIS,
  OTM_MCP_TOOL_VERIFY_TOOL
} from "../src/index.js";
import type {
  DiscoverOpenToolMeshToolsRunner,
  GetOpenToolMeshTraceRunner,
  OpenToolMeshCapabilityRunner,
  PublishOpenToolMeshManifestRunner,
  ResolveOpenToolMeshToolRunner,
  VerifyOpenToolMeshToolRunner
} from "../src/types.js";

const TEST_OWNER = "0x0000000000000000000000000000000000000001" as const;

function createRunner(): {
  calls: Array<Parameters<OpenToolMeshCapabilityRunner>[0]>;
  runner: OpenToolMeshCapabilityRunner;
} {
  const calls: Array<Parameters<OpenToolMeshCapabilityRunner>[0]> = [];
  return {
    calls,
    async runner(input) {
      calls.push(input);
      return {
        capability: input.capability,
        agentId: input.agentId ?? "test-agent",
        status: "ok",
        output: {
          echoed: input.input
        },
        tool: {
          toolId: "otm:ens:scanner.openmesh.eth",
          ensName: "scanner.openmesh.eth",
          manifestUri: "0g://manifests/scanner.json",
          manifestHash: "sha256:test",
          version: "0.1.0",
          ownerAddress: TEST_OWNER
        },
        verification: {
          ok: true,
          toolId: "otm:ens:scanner.openmesh.eth",
          checks: {
            manifestHashValid: true,
            ownerValid: true,
            schemaValid: true,
            versionCompatible: true
          },
          errors: []
        },
        traceId: "trace-test",
        traceUri: "0g://traces/trace-test.json",
        artifacts: {
          requestUri: "0g://artifacts/request.json",
          responseUri: "0g://artifacts/response.json"
        },
        response: {
          requestId: "request-test",
          traceId: "trace-test",
          toolId: "otm:ens:scanner.openmesh.eth",
          status: "ok",
          output: {
            echoed: input.input
          },
          finishedAt: "2026-05-02T00:00:00.000Z"
        }
      };
    }
  };
}

function createManagementRunners() {
  const calls: {
    publish: Array<Parameters<PublishOpenToolMeshManifestRunner>[0]>;
    discover: Array<Parameters<DiscoverOpenToolMeshToolsRunner>[0]>;
    resolve: Array<Parameters<ResolveOpenToolMeshToolRunner>[0]>;
    verify: Array<Parameters<VerifyOpenToolMeshToolRunner>[0]>;
    getTrace: Array<Parameters<GetOpenToolMeshTraceRunner>[0]>;
  } = {
    publish: [],
    discover: [],
    resolve: [],
    verify: [],
    getTrace: []
  };

  return {
    calls,
    runners: {
      async publishToolRunner(input: Parameters<PublishOpenToolMeshManifestRunner>[0]) {
        calls.publish.push(input);
        return {
          toolId: "otm:ens:scanner.openmesh.eth",
          manifestUri: "0g://manifests/scanner.json",
          manifestHash: "sha256:test",
          version: "0.1.0",
          capabilities: ["solidity-static-analysis"],
          providerProfile: "local",
          published: {
            manifestUri: "0g://manifests/scanner.json",
            manifestHash: "sha256:test",
            version: "0.1.0"
          }
        };
      },
      async discoverToolsRunner(input: Parameters<DiscoverOpenToolMeshToolsRunner>[0]) {
        calls.discover.push(input);
        return {
          capability: input.capability,
          count: 1,
          tools: [
            {
              id: "otm:ens:scanner.openmesh.eth",
              ensName: "scanner.openmesh.eth",
              ownerAddress: TEST_OWNER,
              latestManifestUri: "0g://manifests/scanner.json",
              latestManifestHash: "sha256:test",
              latestVersion: "0.1.0",
              capabilities: [input.capability],
              manifestUri: "0g://manifests/scanner.json",
              manifestHash: "sha256:test"
            }
          ]
        };
      },
      async resolveToolRunner(input: Parameters<ResolveOpenToolMeshToolRunner>[0]) {
        calls.resolve.push(input);
        return {
          identity: {
            id: `otm:ens:${input.ensName}`,
            ensName: input.ensName,
            ownerAddress: TEST_OWNER,
            latestManifestUri: "0g://manifests/scanner.json",
            latestManifestHash: "sha256:test",
            latestVersion: "0.1.0",
            capabilities: ["solidity-static-analysis"]
          }
        };
      },
      async verifyToolRunner(input: Parameters<VerifyOpenToolMeshToolRunner>[0]) {
        calls.verify.push(input);
        return {
          identity: {
            id: `otm:ens:${input.ensName}`,
            ensName: input.ensName,
            ownerAddress: TEST_OWNER,
            latestManifestUri: input.manifestUri ?? "0g://manifests/scanner.json",
            latestManifestHash: "sha256:test",
            latestVersion: "0.1.0",
            capabilities: ["solidity-static-analysis"]
          },
          manifest: {
            schemaVersion: "otm.manifest.v1" as const,
            toolId: `otm:ens:${input.ensName}`,
            name: "Scanner",
            version: "0.1.0",
            description: "Scanner",
            owner: {
              address: TEST_OWNER
            },
            capabilities: [{ id: "solidity-static-analysis", description: "scan" }],
            mcp: {
              toolName: "scan",
              protocol: "mcp-compatible" as const,
              inputSchema: {},
              outputSchema: {}
            },
            invocation: {
              transport: "axl" as const,
              axlPeerId: "peer",
              axlMethod: "invokeTool",
              timeoutMs: 1000
            },
            storage: {
              manifestUri: input.manifestUri ?? "0g://manifests/scanner.json",
              traceNamespace: "traces"
            },
            compatibility: {
              sdkVersionRange: "^0.1.0",
              manifestApiVersion: "v1" as const
            },
            integrity: {
              manifestHash: "sha256:test",
              createdAt: "2026-05-02T00:00:00.000Z"
            }
          },
          verification: {
            ok: true,
            toolId: `otm:ens:${input.ensName}`,
            checks: {
              manifestHashValid: true,
              ownerValid: true,
              schemaValid: true,
              versionCompatible: true
            },
            errors: []
          }
        };
      },
      async getTraceRunner(input: Parameters<GetOpenToolMeshTraceRunner>[0]) {
        calls.getTrace.push(input);
        const traceId = input.traceId ?? "trace-test";
        return {
          traceId,
          traceUri: input.traceUri ?? `0g://traces/${traceId}.json`,
          trace: {
            traceId,
            runId: traceId,
            agentId: "test",
            requestedCapability: "solidity-static-analysis",
            tool: {
              toolId: "otm:ens:scanner.openmesh.eth",
              ensName: "scanner.openmesh.eth",
              manifestUri: "0g://manifests/scanner.json",
              manifestHash: "sha256:test",
              version: "0.1.0",
              ownerAddress: TEST_OWNER
            },
            discovery: {
              candidateCount: 1,
              selectedReason: "test",
              resolvedAt: "2026-05-02T00:00:00.000Z"
            },
            verification: {
              manifestHashValid: true,
              ownerValid: true,
              schemaValid: true,
              versionCompatible: true,
              verifiedAt: "2026-05-02T00:00:00.000Z"
            },
            invocation: {
              transport: "axl" as const,
              peerId: "peer",
              method: "invokeTool",
              startedAt: "2026-05-02T00:00:00.000Z",
              status: "ok" as const
            },
            io: {
              inputHash: "sha256:input"
            },
            artifacts: [],
            storage: {
              traceUri: input.traceUri ?? `0g://traces/${traceId}.json`,
              persistedAt: "2026-05-02T00:00:00.000Z",
              backend: "0g-storage" as const
            }
          }
        };
      }
    }
  };
}

describe("OpenTool Mesh MCP handler", () => {
  it("answers initialize with server capabilities", async () => {
    const handler = createOpenToolMeshMcpHandler({ runner: createRunner().runner });
    const response = await handler.handleMessage({
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2025-11-25"
      }
    });

    expect(response).toMatchObject({
      jsonrpc: "2.0",
      id: 1,
      result: {
        protocolVersion: "2025-11-25",
        serverInfo: {
          name: OTM_MCP_SERVER_NAME
        },
        capabilities: {
          tools: {
            listChanged: false
          }
        }
      }
    });
  });

  it("lists invocation and management tools", async () => {
    const handler = createOpenToolMeshMcpHandler({ runner: createRunner().runner });
    const response = await handler.handleMessage({
      jsonrpc: "2.0",
      id: "tools",
      method: "tools/list"
    });

    const tools = ((response as { result: { tools: Array<{ name: string }> } }).result.tools).map(
      (tool) => tool.name
    );

    expect(tools).toEqual([
      OTM_MCP_TOOL_CALL_CAPABILITY,
      OTM_MCP_TOOL_PUBLISH_TOOL,
      OTM_MCP_TOOL_DISCOVER_TOOLS,
      OTM_MCP_TOOL_RESOLVE_TOOL,
      OTM_MCP_TOOL_VERIFY_TOOL,
      OTM_MCP_TOOL_GET_TRACE,
      OTM_MCP_TOOL_SOLIDITY_STATIC_ANALYSIS
    ]);
  });

  it("maps the Solidity tool call to the solidity-static-analysis capability", async () => {
    const { calls, runner } = createRunner();
    const handler = createOpenToolMeshMcpHandler({
      runner,
      workspaceRoot: "/tmp/opentoolmesh",
      agentId: "adapter-agent"
    });
    const response = await handler.handleMessage({
      jsonrpc: "2.0",
      id: "call",
      method: "tools/call",
      params: {
        name: OTM_MCP_TOOL_SOLIDITY_STATIC_ANALYSIS,
        arguments: {
          source: "contract Vault {}"
        }
      }
    });

    expect(calls).toEqual([
      {
        capability: "solidity-static-analysis",
        input: {
          source: "contract Vault {}"
        },
        agentId: "adapter-agent",
        workspaceRoot: "/tmp/opentoolmesh"
      }
    ]);
    expect(response).toMatchObject({
      result: {
        structuredContent: {
          status: "ok",
          traceUri: "0g://traces/trace-test.json"
        }
      }
    });
  });

  it("maps the generic tool call to caller-provided capability and input", async () => {
    const { calls, runner } = createRunner();
    const handler = createOpenToolMeshMcpHandler({ runner });
    const response = await handler.handleMessage({
      jsonrpc: "2.0",
      id: "call",
      method: "tools/call",
      params: {
        name: OTM_MCP_TOOL_CALL_CAPABILITY,
        arguments: {
          capability: "solidity-static-analysis",
          input: {
            source: "contract Vault {}"
          },
          agentId: "custom-agent"
        }
      }
    });

    expect(calls[0]).toMatchObject({
      capability: "solidity-static-analysis",
      agentId: "custom-agent"
    });
    expect(response).toMatchObject({
      result: {
        isError: false
      }
    });
  });

  it("maps publish/discover/resolve/verify/get_trace management calls", async () => {
    const { calls, runners } = createManagementRunners();
    const handler = createOpenToolMeshMcpHandler({
      runner: createRunner().runner,
      workspaceRoot: "/tmp/opentoolmesh",
      ...runners
    });

    const publishResponse = await handler.handleMessage({
      jsonrpc: "2.0",
      id: "publish",
      method: "tools/call",
      params: {
        name: OTM_MCP_TOOL_PUBLISH_TOOL,
        arguments: {
          manifestPath: "manifests/scanner.json"
        }
      }
    });
    const discoverResponse = await handler.handleMessage({
      jsonrpc: "2.0",
      id: "discover",
      method: "tools/call",
      params: {
        name: OTM_MCP_TOOL_DISCOVER_TOOLS,
        arguments: {
          capability: "solidity-static-analysis",
          limit: 1
        }
      }
    });
    const resolveResponse = await handler.handleMessage({
      jsonrpc: "2.0",
      id: "resolve",
      method: "tools/call",
      params: {
        name: OTM_MCP_TOOL_RESOLVE_TOOL,
        arguments: {
          ensName: "scanner.openmesh.eth"
        }
      }
    });
    const verifyResponse = await handler.handleMessage({
      jsonrpc: "2.0",
      id: "verify",
      method: "tools/call",
      params: {
        name: OTM_MCP_TOOL_VERIFY_TOOL,
        arguments: {
          ensName: "scanner.openmesh.eth",
          manifestUri: "0g://manifests/scanner.json"
        }
      }
    });
    const traceResponse = await handler.handleMessage({
      jsonrpc: "2.0",
      id: "trace",
      method: "tools/call",
      params: {
        name: OTM_MCP_TOOL_GET_TRACE,
        arguments: {
          traceId: "trace-test"
        }
      }
    });

    expect(calls.publish[0]).toEqual({
      manifestPath: "manifests/scanner.json",
      manifest: undefined,
      workspaceRoot: "/tmp/opentoolmesh"
    });
    expect(calls.discover[0]).toEqual({
      capability: "solidity-static-analysis",
      limit: 1,
      workspaceRoot: "/tmp/opentoolmesh"
    });
    expect(calls.resolve[0]).toEqual({
      ensName: "scanner.openmesh.eth",
      workspaceRoot: "/tmp/opentoolmesh"
    });
    expect(calls.verify[0]).toEqual({
      ensName: "scanner.openmesh.eth",
      manifestUri: "0g://manifests/scanner.json",
      sdkVersion: undefined,
      workspaceRoot: "/tmp/opentoolmesh"
    });
    expect(calls.getTrace[0]).toEqual({
      traceId: "trace-test",
      traceUri: undefined,
      workspaceRoot: "/tmp/opentoolmesh"
    });
    expect(publishResponse).toMatchObject({ result: { structuredContent: { manifestUri: "0g://manifests/scanner.json" } } });
    expect(discoverResponse).toMatchObject({ result: { structuredContent: { count: 1 } } });
    expect(resolveResponse).toMatchObject({ result: { structuredContent: { identity: { ensName: "scanner.openmesh.eth" } } } });
    expect(verifyResponse).toMatchObject({ result: { structuredContent: { verification: { ok: true } } } });
    expect(traceResponse).toMatchObject({ result: { structuredContent: { traceUri: "0g://traces/trace-test.json" } } });
  });
});
