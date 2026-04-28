import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import type { CapabilityIndexEntry, ToolManifest } from "@opentoolmesh/shared";
import type {
  BlobStorageAdapter,
  EnsAdapter,
  InvocationTransport,
  KvIndexAdapter,
  OpenToolMeshClientDeps
} from "./create-client.js";

interface EnsRegistryRecord {
  ownerAddress: `0x${string}`;
  records: Record<string, string>;
}

interface AxlPeerRegistry {
  peers: Record<string, string>;
}

function canonicalize(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((item) => canonicalize(item)).join(",")}]`;
  }

  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).sort(([left], [right]) =>
      left.localeCompare(right)
    );
    return `{${entries
      .map(([key, nested]) => `${JSON.stringify(key)}:${canonicalize(nested)}`)
      .join(",")}}`;
  }

  return JSON.stringify(value);
}

export function hashJson(value: unknown): string {
  return `sha256:${createHash("sha256").update(canonicalize(value)).digest("hex")}`;
}

export function hashManifest(manifest: ToolManifest): string {
  const clone = structuredClone(manifest);
  clone.integrity.manifestHash = "";
  return hashJson(clone);
}

function sanitizeKey(key: string): string {
  return key.replace(/[^a-zA-Z0-9._-]/g, "_");
}

async function readJsonFile<T>(path: string, fallback: T): Promise<T> {
  try {
    return JSON.parse(await readFile(path, "utf8")) as T;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return fallback;
    }
    throw error;
  }
}

async function writeJsonFile(path: string, value: unknown): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function parse0gUri(uri: string): string[] {
  if (!uri.startsWith("0g://")) {
    throw new Error(`Unsupported storage URI: ${uri}`);
  }

  return uri.slice("0g://".length).split("/");
}

export interface LocalDevnetPaths {
  rootDir: string;
  stateDir: string;
  storageDir: string;
  kvDir: string;
  ensFile: string;
  peersFile: string;
}

export function createLocalDevnetPaths(rootDir: string): LocalDevnetPaths {
  const stateDir = resolve(rootDir, ".opentoolmesh");
  return {
    rootDir,
    stateDir,
    storageDir: join(stateDir, "storage"),
    kvDir: join(stateDir, "kv"),
    ensFile: join(stateDir, "ens-records.json"),
    peersFile: join(stateDir, "axl-peers.json")
  };
}

export function createLocalEnsAdapter(paths: LocalDevnetPaths): EnsAdapter {
  return {
    async resolveTextRecords(ensName) {
      const registry = await readJsonFile<Record<string, EnsRegistryRecord>>(paths.ensFile, {});
      return registry[ensName]?.records ?? {};
    },
    async resolveOwner(ensName) {
      const registry = await readJsonFile<Record<string, EnsRegistryRecord>>(paths.ensFile, {});
      return registry[ensName]?.ownerAddress ?? null;
    },
    async setTextRecords(ensName, records) {
      const registry = await readJsonFile<Record<string, EnsRegistryRecord>>(paths.ensFile, {});
      const existing = registry[ensName] ?? {
        ownerAddress: (records["opentoolmesh.owner"] as `0x${string}` | undefined) ?? "0x0000000000000000000000000000000000000000",
        records: {}
      };
      registry[ensName] = {
        ownerAddress: existing.ownerAddress,
        records: {
          ...existing.records,
          ...records
        }
      };
      if (records["opentoolmesh.owner"]) {
        registry[ensName].ownerAddress = records["opentoolmesh.owner"] as `0x${string}`;
      }
      await writeJsonFile(paths.ensFile, registry);
    }
  };
}

export function createLocalBlobStorageAdapter(paths: LocalDevnetPaths): BlobStorageAdapter {
  return {
    async putJson(namespace, value) {
      const id = selectBlobId(value);
      const filePath = join(paths.storageDir, namespace, id);
      await writeJsonFile(filePath, value);
      return {
        uri: `0g://${namespace}/${id}`,
        hash: hashJson(value)
      };
    },
    async getJson<T>(uri: string) {
      const segments = parse0gUri(uri);
      const filePath = join(paths.storageDir, ...segments);
      return JSON.parse(await readFile(filePath, "utf8")) as T;
    }
  };
}

function selectBlobId(value: unknown): string {
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    if (typeof record.toolId === "string" && typeof record.version === "string") {
      return `${sanitizeKey(record.toolId)}-${sanitizeKey(record.version)}.json`;
    }
    if (typeof record.traceId === "string") {
      return `${sanitizeKey(record.traceId)}.json`;
    }
    if (typeof record.reportId === "string") {
      return `${sanitizeKey(record.reportId)}.json`;
    }
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2, 10)}.json`;
}

export function createLocalKvAdapter(paths: LocalDevnetPaths): KvIndexAdapter {
  return {
    async put(key, value) {
      const filePath = join(paths.kvDir, `${sanitizeKey(key)}.json`);
      await writeJsonFile(filePath, value);
    },
    async get<T>(key: string) {
      const filePath = join(paths.kvDir, `${sanitizeKey(key)}.json`);
      return readJsonFile<T | null>(filePath, null);
    },
    async listByPrefix<T>(prefix: string) {
      const index = await readJsonFile<Record<string, T>>(join(paths.kvDir, "_index.json"), {});
      return Object.entries(index)
        .filter(([key]) => key.startsWith(prefix))
        .map(([, value]) => value);
    }
  };
}

export function createLocalInvocationTransport(paths: LocalDevnetPaths): InvocationTransport {
  return {
    async invoke<TReq, TRes>(peerId: string, method: string, payload: TReq, timeoutMs: number) {
      const registry = await readJsonFile<AxlPeerRegistry>(paths.peersFile, { peers: {} });
      const baseUrl = registry.peers[peerId];

      if (!baseUrl) {
        throw new Error(`AXL peer not registered: ${peerId}`);
      }

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const response = await fetch(`${baseUrl.replace(/\/$/, "")}/${method}`, {
          method: "POST",
          headers: {
            "content-type": "application/json"
          },
          body: JSON.stringify(payload),
          signal: controller.signal
        });

        if (!response.ok) {
          throw new Error(`Invocation failed with status ${response.status}`);
        }

        return (await response.json()) as TRes;
      } finally {
        clearTimeout(timer);
      }
    }
  };
}

export function createLocalDevnetClientDeps(rootDir: string): OpenToolMeshClientDeps {
  const paths = createLocalDevnetPaths(rootDir);
  return {
    ens: createLocalEnsAdapter(paths),
    blob: createLocalBlobStorageAdapter(paths),
    kv: createLocalKvAdapter(paths),
    transport: createLocalInvocationTransport(paths)
  };
}

export async function seedPeerRegistry(rootDir: string, peers: Record<string, string>): Promise<void> {
  const paths = createLocalDevnetPaths(rootDir);
  await writeJsonFile(paths.peersFile, { peers });
}

export async function seedCapabilityIndex(rootDir: string, manifest: ToolManifest): Promise<CapabilityIndexEntry[]> {
  const paths = createLocalDevnetPaths(rootDir);
  const kv = createLocalKvAdapter(paths);
  const entries: CapabilityIndexEntry[] = [];

  for (const capability of manifest.capabilities) {
    const key = `capability:${capability.id}`;
    const current =
      (await kv.get<CapabilityIndexEntry>(key)) ??
      ({
        capability: capability.id,
        tools: []
      } satisfies CapabilityIndexEntry);

    current.tools = current.tools.filter((tool) => tool.toolId !== manifest.toolId);
    current.tools.push({
      toolId: manifest.toolId,
      ensName: manifest.toolId.replace("otm:ens:", ""),
      manifestUri: manifest.storage.manifestUri,
      manifestHash: manifest.integrity.manifestHash,
      version: manifest.version,
      ownerAddress: manifest.owner.address,
      updatedAt: new Date().toISOString(),
      priority: 1
    });
    await kv.put(key, current);
    entries.push(current);
  }

  return entries;
}
