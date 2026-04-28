#!/usr/bin/env node
import { callCommand } from "./commands/call.js";
import { discoverCommand } from "./commands/discover.js";
import { publishCommand } from "./commands/publish.js";
import { resolveCommand } from "./commands/resolve.js";
import { traceCommand } from "./commands/trace.js";
import type { CliCommand } from "./commands/types.js";

const commands = new Map<string, CliCommand>(
  [publishCommand, resolveCommand, discoverCommand, callCommand, traceCommand].map((command) => [
    command.name,
    command
  ])
);

async function main() {
  const [, , commandName, ...args] = process.argv;

  if (!commandName || commandName === "--help") {
    console.log("Usage: opentool <publish|resolve|discover|call|trace> [...args]");
    return;
  }

  const command = commands.get(commandName);

  if (!command) {
    throw new Error(`Unknown command: ${commandName}`);
  }

  await command.run(args, {
    cwd: process.cwd(),
    stdout: console
  });
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});

