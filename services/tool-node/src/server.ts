import { createSolidityScanner } from "./scanner/solidity-pattern-scanner.js";

export function createToolNodeServer() {
  return {
    capability: "solidity-static-analysis",
    handler: createSolidityScanner()
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  console.log("OpenTool Mesh tool node scaffold ready");
}

