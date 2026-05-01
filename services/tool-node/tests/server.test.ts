import { afterEach, describe, expect, it } from "vitest";
import { createToolNodeServer } from "../src/server.js";

const servers: Array<ReturnType<ReturnType<typeof createToolNodeServer>["listen"]>> = [];

afterEach(async () => {
  await Promise.all(
    servers.splice(0).map(
      (server) =>
        new Promise<void>((resolve, reject) => {
          server.close((error) => {
            if (error) {
              reject(error);
              return;
            }
            resolve();
          });
        })
    )
  );
});

describe("tool node server", () => {
  it("exposes a health endpoint for demo orchestration", async () => {
    const server = createToolNodeServer().listen(0);
    servers.push(server);

    const baseUrl = await getBaseUrl(server);

    const response = await fetch(`${baseUrl}/health`);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      capability: "solidity-static-analysis"
    });
  });

  it("keeps the existing /invokeTool endpoint", async () => {
    const server = createToolNodeServer().listen(0);
    servers.push(server);

    const baseUrl = await getBaseUrl(server);
    const response = await fetch(`${baseUrl}/invokeTool`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(createInvokeEnvelope("req-http", "contract Vault { address public owner; }"))
    });

    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      kind: string;
      response: {
        status: string;
        output?: {
          summary: {
            totalFindings: number;
          };
        };
      };
    };

    expect(body.kind).toBe("otm.tool.result");
    expect(body.response.status).toBe("ok");
    expect(body.response.output?.summary.totalFindings).toBe(1);
  });

  it("exposes invokeTool through the AXL MCP JSON-RPC bridge", async () => {
    const server = createToolNodeServer().listen(0);
    servers.push(server);

    const baseUrl = await getBaseUrl(server);
    const response = await fetch(`${baseUrl}/mcp/peer%2Ftool-node/invokeTool`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: "rpc-1",
        method: "invokeTool",
        params: createInvokeEnvelope(
          "req-mcp",
          `
            contract Vault {
              function withdraw(uint256 amount) external {
                (bool ok, ) = msg.sender.call{value: amount}("");
                require(ok, "transfer failed");
              }
            }
          `
        )
      })
    });

    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      jsonrpc: string;
      id: string;
      result: {
        kind: string;
        response: {
          requestId: string;
          status: string;
          output?: {
            summary: {
              high: number;
            };
          };
        };
      };
    };

    expect(body.jsonrpc).toBe("2.0");
    expect(body.id).toBe("rpc-1");
    expect(body.result.kind).toBe("otm.tool.result");
    expect(body.result.response.requestId).toBe("req-mcp");
    expect(body.result.response.status).toBe("ok");
    expect(body.result.response.output?.summary.high).toBe(1);
  });

  it("accepts direct payload params with invokeTool as the default JSON-RPC method", async () => {
    const server = createToolNodeServer().listen(0);
    servers.push(server);

    const baseUrl = await getBaseUrl(server);
    const response = await fetch(`${baseUrl}/mcp/local-peer/solidity-scanner`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 42,
        params: {
          source: "contract Vault { bool public paused; }"
        }
      })
    });

    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      jsonrpc: string;
      id: number;
      result: {
        kind: string;
        response: {
          requestId: string;
          status: string;
          output?: {
            summary: {
              medium: number;
            };
          };
        };
      };
    };

    expect(body).toMatchObject({
      jsonrpc: "2.0",
      id: 42,
      result: {
        kind: "otm.tool.result",
        response: {
          requestId: "42",
          status: "ok"
        }
      }
    });
    expect(body.result.response.output?.summary.medium).toBe(1);
  });
});

function createInvokeEnvelope(requestId: string, source: string) {
  return {
    kind: "otm.tool.invoke",
    request: {
      requestId,
      traceId: `trace-${requestId}`,
      toolId: "otm:ens:solidity-scanner.auditagent.eth",
      capability: "solidity-static-analysis",
      manifestUri: "0g://manifests/otm_ens_solidity-scanner.auditagent.eth-0.1.0.json",
      manifestHash: "sha256:test",
      caller: { agentId: "demo-agent" },
      input: { source },
      inputHash: "sha256:test-input",
      sentAt: "2026-04-28T00:00:00.000Z"
    }
  };
}

async function getBaseUrl(server: ReturnType<ReturnType<typeof createToolNodeServer>["listen"]>): Promise<string> {
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const address = server.address();

  if (!address || typeof address !== "object") {
    throw new Error("Expected server address to be available");
  }

  return `http://127.0.0.1:${address.port}`;
}
