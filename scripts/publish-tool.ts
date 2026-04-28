import { readFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

async function main() {
  const rootDir = new URL("..", import.meta.url).pathname;
  await execFileAsync("corepack", ["pnpm", "--filter", "@opentoolmesh/sdk", "build"], { cwd: rootDir });
  const {
    createLocalDevnetClientDeps,
    createOpenToolMeshClient,
    findWorkspaceRoot,
    hashManifest,
    seedCapabilityIndex,
    seedPeerRegistry
  } = await import("../packages/sdk/dist/sdk/src/index.js");
  const workspaceRoot = await findWorkspaceRoot(rootDir);
  const client = createOpenToolMeshClient(createLocalDevnetClientDeps(workspaceRoot));
  const manifest = JSON.parse(
    await readFile(new URL("../manifests/solidity-pattern-scanner.manifest.json", import.meta.url), "utf8")
  );
  const nextManifest = structuredClone(manifest);
  nextManifest.integrity.manifestHash = hashManifest(nextManifest);

  await seedPeerRegistry(workspaceRoot, {
    "axl-peer-solidity-01": "http://127.0.0.1:4318"
  });

  const published = await client.publishManifest({ manifest: nextManifest });
  nextManifest.storage.manifestUri = published.manifestUri;
  nextManifest.integrity.manifestHash = published.manifestHash;
  await seedCapabilityIndex(workspaceRoot, nextManifest);

  console.log(
    JSON.stringify(
      {
        toolId: nextManifest.toolId,
        manifestUri: published.manifestUri,
        manifestHash: published.manifestHash,
        version: published.version,
        capabilities: nextManifest.capabilities.map((capability) => capability.id),
        peerId: nextManifest.invocation.axlPeerId
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
