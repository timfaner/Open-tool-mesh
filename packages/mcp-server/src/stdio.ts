import { createInterface } from "node:readline";
import { stdin as defaultStdin, stdout as defaultStdout } from "node:process";
import { createOpenToolMeshMcpHandler, type OpenToolMeshMcpHandlerOptions } from "./mcp-handler.js";

export interface StdioMcpServerOptions extends OpenToolMeshMcpHandlerOptions {
  stdin?: NodeJS.ReadableStream;
  stdout?: NodeJS.WritableStream;
}

export function runStdioMcpServer(options: StdioMcpServerOptions = {}): void {
  const handler = createOpenToolMeshMcpHandler(options);
  const stdin = options.stdin ?? defaultStdin;
  const stdout = options.stdout ?? defaultStdout;
  const lines = createInterface({
    input: stdin,
    terminal: false
  });
  let pending = Promise.resolve();

  lines.on("line", (line) => {
    const trimmed = line.trim();
    if (trimmed.length === 0) {
      return;
    }

    pending = pending.then(async () => {
      const message = JSON.parse(trimmed);
      const response = await handler.handleMessage(message);

      if (response !== undefined) {
        stdout.write(`${JSON.stringify(response)}\n`);
      }
    });
    pending.catch((error) => {
      stdout.write(
        `${JSON.stringify({
          jsonrpc: "2.0",
          id: null,
          error: {
            code: -32000,
            message: error instanceof Error ? error.message : String(error)
          }
        })}\n`
      );
    });
  });
}
