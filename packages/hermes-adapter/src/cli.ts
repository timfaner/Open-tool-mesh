#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { callOpenToolMeshCapability } from "@opentoolmesh/mcp-server";

const [sourcePath] = process.argv.slice(2);

if (!sourcePath || sourcePath === "--help") {
  console.log(`Usage:
  opentoolmesh-hermes-call <solidity-source-file>

Runs the OpenTool Mesh solidity-static-analysis capability and prints the structured result.
`);
  process.exit(sourcePath ? 0 : 1);
}

const source = await readFile(sourcePath, "utf8");
const result = await callOpenToolMeshCapability({
  capability: "solidity-static-analysis",
  input: { source },
  agentId: "hermes-opentoolmesh"
});

console.log(JSON.stringify(result, null, 2));
