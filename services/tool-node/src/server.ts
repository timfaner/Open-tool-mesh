import { createServer } from "node:http";
import type { AxlInvokeEnvelope } from "@opentoolmesh/shared";
import { createSolidityScanner } from "./scanner/solidity-pattern-scanner.js";
import { invokeToolHandler } from "./handlers/invoke-tool.js";
import { mcpBridgeHandler, parseMcpRoute } from "./mcp-bridge.js";

export function createToolNodeServer() {
  const scanner = createSolidityScanner();

  return {
    capability: "solidity-static-analysis",
    handler: scanner,
    listen(port = Number(process.env.PORT ?? "4318"), host = process.env.HOST ?? "127.0.0.1") {
      const server = createServer(async (request, response) => {
        const url = new URL(request.url ?? "/", "http://127.0.0.1");

        if (request.method === "GET" && url.pathname === "/health") {
          response.setHeader("content-type", "application/json");
          response.end(
            JSON.stringify({
              ok: true,
              capability: "solidity-static-analysis"
            })
          );
          return;
        }

        if (request.method === "POST" && url.pathname === "/invokeTool") {
          const envelope = (await readJsonBody(request)) as AxlInvokeEnvelope<{ source: string }>;
          const result = await invokeToolHandler(envelope, scanner);

          response.setHeader("content-type", "application/json");
          response.end(JSON.stringify(result));
          return;
        }

        const mcpRoute = parseMcpRoute(url.pathname);
        if (request.method === "POST" && mcpRoute) {
          const rpcRequest = await readJsonBody(request);
          const rpcResponse = await mcpBridgeHandler(rpcRequest, scanner);

          response.setHeader("content-type", "application/json");
          response.end(JSON.stringify(rpcResponse));
          return;
        }

        if (request.method !== "POST" || url.pathname !== "/invokeTool") {
          response.statusCode = 404;
          response.end("Not found");
          return;
        }
      });

      server.listen(port, host);
      return server;
    }
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const server = createToolNodeServer().listen();
  server.on("listening", () => {
    const address = server.address();
    if (address && typeof address === "object") {
      console.log(`OpenTool Mesh tool node listening on http://127.0.0.1:${address.port}`);
    }
  });
}

async function readJsonBody(request: AsyncIterable<unknown>): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    chunks.push(Buffer.from(chunk as Buffer));
  }

  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}
