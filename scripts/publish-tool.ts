import { readFile } from "node:fs/promises";
import {
  createLocalDevnetClientDeps,
  createOpenToolMeshClient,
  findWorkspaceRoot,
  hashManifest,
  seedCapabilityIndex,
  seedPeerRegistry
} from "../packages/sdk/src/index.ts";

async function main() {
  const rootDir = await findWorkspaceRoot(new URL(".", import.meta.url).pathname);
  const client = createOpenToolMeshClient(createLocalDevnetClientDeps(rootDir));
  const manifest = JSON.parse(
    await readFile(new URL("../manifests/solidity-pattern-scanner.manifest.json", import.meta.url), "utf8")
  );
  const nextManifest = structuredClone(manifest);
  nextManifest.integrity.manifestHash = hashManifest(nextManifest);

  await seedPeerRegistry(rootDir, {
    "axl-peer-solidity-01": "http://127.0.0.1:4318"
  });

  const published = await client.publishManifest({ manifest: nextManifest });
  nextManifest.storage.manifestUri = published.manifestUri;
  nextManifest.integrity.manifestHash = published.manifestHash;
  await seedCapabilityIndex(rootDir, nextManifest);

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
