import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { createOpenToolMeshMcpHandler, type OpenToolMeshMcpHandlerOptions } from "./mcp-handler.js";

export interface HttpMcpServerOptions extends OpenToolMeshMcpHandlerOptions {
  host?: string;
  port?: number;
  path?: string;
}

export function createHttpMcpServer(options: HttpMcpServerOptions = {}): Server {
  const handler = createOpenToolMeshMcpHandler(options);
  const mcpPath = options.path ?? "/mcp";

  return createServer(async (request, response) => {
    try {
      const url = new URL(request.url ?? "/", "http://127.0.0.1");

      if (request.method === "GET" && url.pathname === "/health") {
        writeJson(response, 200, {
          ok: true,
          server: "opentoolmesh-mcp",
          mcpPath
        });
        return;
      }

      if (request.method === "OPTIONS") {
        response.statusCode = 204;
        response.setHeader("access-control-allow-origin", "*");
        response.setHeader("access-control-allow-methods", "POST, OPTIONS");
        response.setHeader("access-control-allow-headers", "content-type, authorization");
        response.end();
        return;
      }

      if (request.method !== "POST" || url.pathname !== mcpPath) {
        response.statusCode = 404;
        response.end("Not found");
        return;
      }

      const body = await readJsonBody(request);
      const result = await handler.handleMessage(body);

      if (result === undefined) {
        response.statusCode = 202;
        response.end();
        return;
      }

      writeJson(response, 200, result);
    } catch (error) {
      writeJson(response, 500, {
        jsonrpc: "2.0",
        id: null,
        error: {
          code: -32000,
          message: error instanceof Error ? error.message : String(error)
        }
      });
    }
  });
}

export function listenHttpMcpServer(options: HttpMcpServerOptions = {}): Server {
  const host = options.host ?? "127.0.0.1";
  const port = options.port ?? 8765;
  const server = createHttpMcpServer(options);
  server.listen(port, host);
  return server;
}

async function readJsonBody(request: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    chunks.push(Buffer.from(chunk as Buffer));
  }

  const raw = Buffer.concat(chunks).toString("utf8");
  return raw.length === 0 ? {} : JSON.parse(raw);
}

function writeJson(response: ServerResponse, statusCode: number, value: unknown): void {
  response.statusCode = statusCode;
  response.setHeader("access-control-allow-origin", "*");
  response.setHeader("content-type", "application/json");
  response.end(JSON.stringify(value));
}
