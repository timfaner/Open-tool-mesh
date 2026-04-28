import { readFile } from "node:fs/promises";
import { findWorkspaceRoot, hashManifest, seedCapabilityIndex } from "../packages/sdk/src/index.ts";

async function main() {
  const rootDir = await findWorkspaceRoot(new URL(".", import.meta.url).pathname);
  const manifest = JSON.parse(
    await readFile(new URL("../manifests/solidity-pattern-scanner.manifest.json", import.meta.url), "utf8")
  );
  const nextManifest = structuredClone(manifest);
  nextManifest.integrity.manifestHash = hashManifest(nextManifest);
  const entries = await seedCapabilityIndex(rootDir, nextManifest);

  console.log(
    JSON.stringify(
      {
        capabilityCount: entries.length,
        capabilities: entries.map((entry) => ({
          capability: entry.capability,
          toolIds: entry.tools.map((tool) => tool.toolId)
        }))
      },
      null,
      2
    )
  );
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
