#!/usr/bin/env node
import { listenHttpMcpServer } from "./http.js";
import { runStdioMcpServer } from "./stdio.js";

interface CliOptions {
  transport: "stdio" | "http";
  host?: string;
  port?: number;
  workspaceRoot?: string;
  agentId?: string;
}

const options = parseArgs(process.argv.slice(2));

if (options.transport === "http") {
  const server = listenHttpMcpServer({
    host: options.host,
    port: options.port,
    workspaceRoot: options.workspaceRoot,
    agentId: options.agentId
  });
  server.on("listening", () => {
    const address = server.address();
    if (address && typeof address === "object") {
      console.error(`OpenTool Mesh MCP server listening on http://${address.address}:${address.port}/mcp`);
    }
  });
} else {
  runStdioMcpServer({
    workspaceRoot: options.workspaceRoot,
    agentId: options.agentId
  });
}

function parseArgs(args: string[]): CliOptions {
  const options: CliOptions = {
    transport: "stdio"
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    const next = args[index + 1];

    switch (arg) {
      case "--transport":
        if (next !== "stdio" && next !== "http") {
          throw new Error("--transport must be stdio or http");
        }
        options.transport = next;
        index += 1;
        break;
      case "--host":
        options.host = requireValue(next, "--host");
        index += 1;
        break;
      case "--port":
        options.port = Number.parseInt(requireValue(next, "--port"), 10);
        if (!Number.isInteger(options.port)) {
          throw new Error("--port must be an integer");
        }
        index += 1;
        break;
      case "--workspace-root":
        options.workspaceRoot = requireValue(next, "--workspace-root");
        index += 1;
        break;
      case "--agent-id":
        options.agentId = requireValue(next, "--agent-id");
        index += 1;
        break;
      case "--help":
        printHelp();
        process.exit(0);
      default:
        throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return options;
}

function requireValue(value: string | undefined, flag: string): string {
  if (!value) {
    throw new Error(`${flag} requires a value`);
  }

  return value;
}

function printHelp(): void {
  console.log(`OpenTool Mesh MCP server

Usage:
  opentoolmesh-mcp --transport stdio [--workspace-root <path>] [--agent-id <id>]
  opentoolmesh-mcp --transport http [--host 127.0.0.1] [--port 8765]

Environment:
  OTM_PROVIDER_PROFILE=local|provider-testnet|provider-mainnet
  See docs/operations/real-provider-mvp-runbook.md for provider-backed values.
`);
}
