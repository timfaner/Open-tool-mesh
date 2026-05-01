import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import type { ToolManifest } from "@opentoolmesh/shared";
import {
  createLocalDevnetPaths,
  createOpenToolMeshClient,
  createProviderClientDeps,
  createProviderConfigFromEnv,
  findWorkspaceRoot,
  hashManifest,
  seedCapabilityIndex
} from "@opentoolmesh/sdk";

export async function createCliClient(startDir: string) {
  const rootDir = await findWorkspaceRoot(startDir);
  const providerConfig = createProviderConfigFromEnv(process.env, rootDir);
  const client = createOpenToolMeshClient(createProviderClientDeps(providerConfig));
  return { client, rootDir, providerConfig };
}

export function getFlag(args: string[], name: string, fallback?: string): string {
  const index = args.indexOf(name);
  const value = index === -1 ? fallback : args[index + 1];
  if (!value) {
    throw new Error(`Missing required flag ${name}`);
  }
  return value;
}

export async function readJsonFromFile<T>(cwd: string, filePath: string): Promise<T> {
  return JSON.parse(await readFile(resolve(cwd, filePath), "utf8")) as T;
}

export async function readManifestFromFile(cwd: string, filePath: string): Promise<ToolManifest> {
  const manifest = await readJsonFromFile<ToolManifest>(cwd, filePath);
  manifest.integrity.manifestHash = hashManifest(manifest);
  return manifest;
}

export async function publishAndIndexManifest(cwd: string, filePath: string) {
  const { client, rootDir, providerConfig } = await createCliClient(cwd);
  const manifest = await readManifestFromFile(cwd, filePath);
  const published = await client.publishManifest({ manifest });
  manifest.storage.manifestUri = published.manifestUri;
  manifest.integrity.manifestHash = published.manifestHash;
  if (providerConfig.profile === "local") {
    await seedCapabilityIndex(rootDir, manifest);
  }
  return { client, rootDir, manifest, published, providerConfig };
}

export async function readStoredTrace(cwd: string, traceId: string) {
  const rootDir = await findWorkspaceRoot(cwd);
  const paths = createLocalDevnetPaths(rootDir);
  const tracePath = join(paths.storageDir, "traces", `${traceId}.json`);
  return JSON.parse(await readFile(tracePath, "utf8")) as unknown;
}
