import { readFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const DEFAULT_TOOL_NODE_BASE_URL = process.env.OTM_TOOL_NODE_BASE_URL ?? "http://127.0.0.1:4318";

export async function publishDemoTool() {
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
    "axl-peer-solidity-01": DEFAULT_TOOL_NODE_BASE_URL
  });

  const published = await client.publishManifest({ manifest: nextManifest });
  nextManifest.storage.manifestUri = published.manifestUri;
  nextManifest.integrity.manifestHash = published.manifestHash;
  await seedCapabilityIndex(workspaceRoot, nextManifest);

  return {
    toolId: nextManifest.toolId,
    manifestUri: published.manifestUri,
    manifestHash: published.manifestHash,
    version: published.version,
    capabilities: nextManifest.capabilities.map((capability) => capability.id),
    peerId: nextManifest.invocation.axlPeerId,
    peerBaseUrl: DEFAULT_TOOL_NODE_BASE_URL
  };
}

async function main() {
  console.log(JSON.stringify(await publishDemoTool(), null, 2));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}
