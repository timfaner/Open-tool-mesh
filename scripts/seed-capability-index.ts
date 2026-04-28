import { readFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

async function main() {
  const rootDir = new URL("..", import.meta.url).pathname;
  await execFileAsync("corepack", ["pnpm", "--filter", "@opentoolmesh/sdk", "build"], { cwd: rootDir });
  const { findWorkspaceRoot, hashManifest, seedCapabilityIndex } = await import(
    "../packages/sdk/dist/sdk/src/index.js"
  );
  const workspaceRoot = await findWorkspaceRoot(rootDir);
  const manifest = JSON.parse(
    await readFile(new URL("../manifests/solidity-pattern-scanner.manifest.json", import.meta.url), "utf8")
  );
  const nextManifest = structuredClone(manifest);
  nextManifest.integrity.manifestHash = hashManifest(nextManifest);
  const entries = await seedCapabilityIndex(workspaceRoot, nextManifest);

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
