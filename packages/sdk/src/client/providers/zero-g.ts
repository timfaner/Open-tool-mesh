import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { BlobStorageAdapter, KvIndexAdapter } from "../create-client.js";

type OptionalModule = Record<string, unknown>;
type UnknownConstructor<T> = new (...args: unknown[]) => T;
type UnknownFunction<T = unknown> = (...args: unknown[]) => T;

const DEFAULT_0G_FLOW_CONTRACT = "0x22E03a6A89B950F1c82ec5e74F8eCa321a105296";

export interface ZeroGBlobStorageAdapterConfig {
  rpcUrl?: string;
  indexerRpcUrl: string;
  privateKey?: string;
  tempDir?: string;
}

export interface ZeroGKvAdapterConfig {
  kvNodeUrl: string;
  streamId: string;
  rpcUrl?: string;
  indexerRpcUrl?: string;
  privateKey?: string;
  flowContract?: unknown;
}

export function createZeroGBlobStorageAdapter(config: ZeroGBlobStorageAdapterConfig): BlobStorageAdapter {
  return {
    async putJson(_namespace, value) {
      validateBlobConfig(config);
      const rpcUrl = config.rpcUrl;
      const privateKey = config.privateKey;
      if (!rpcUrl || !privateKey) {
        throw new Error("0G blob put requires rpcUrl, indexerRpcUrl, and privateKey");
      }
      const { zeroG, ethers } = await loadZeroGDeps();
      const tempPath = await writeTempJson(config.tempDir, value);
      const file = await createZgFile(zeroG, tempPath);

      try {
        const tree = await getMerkleTree(file);
        const rootHash = String(tree.rootHash());
        const indexer = createIndexer(zeroG, config.indexerRpcUrl);
        const signer = createSigner(ethers, rpcUrl, privateKey);
        const [, err] = await indexer.upload(file, rpcUrl, signer);

        if (err) {
          throw new Error(`0G blob upload failed: ${formatError(err)}`);
        }

        return {
          uri: `0g://root/${rootHash}`,
          hash: rootHash
        };
      } finally {
        await closeZgFile(file);
        await rm(tempPath, { force: true });
      }
    },
    async getJson<T>(uri: string) {
      validateBlobReadConfig(config);
      const rootHash = parseRootUri(uri);
      const zeroG = await loadZeroGSdk();
      const tempPath = join(await mkdtemp(join(config.tempDir ?? tmpdir(), "otm-0g-")), "blob.json");
      const indexer = createIndexer(zeroG, config.indexerRpcUrl);

      try {
        const err = await indexer.download(rootHash, tempPath, false);
        if (err) {
          throw new Error(`0G blob download failed: ${formatError(err)}`);
        }
        return JSON.parse(await readFile(tempPath, "utf8")) as T;
      } finally {
        await rm(tempPath, { force: true });
      }
    }
  };
}

export function createZeroGKvAdapter(config: ZeroGKvAdapterConfig): KvIndexAdapter {
  return {
    async put(key, value) {
      validateKvWriteConfig(config);
      const { zeroG, ethers } = await loadZeroGDeps();
      const keyBytes = bytesFromString(key);
      const valueBytes = bytesFromString(JSON.stringify(value));
      const indexer = createIndexer(zeroG, config.indexerRpcUrl);
      const [nodes, selectErr] = await indexer.selectNodes(1);

      if (selectErr) {
        throw new Error(`0G KV node selection failed: ${formatError(selectErr)}`);
      }
      if (typeof zeroG.Batcher !== "function") {
        throw new Error("0G KV put requires Batcher export from @0gfoundation/0g-ts-sdk");
      }

      const flowContract = config.flowContract ?? createFlowContract(zeroG, ethers, config);
      const Batcher = zeroG.Batcher as UnknownConstructor<{
        streamDataBuilder: {
          set(streamId: string, key: Uint8Array, value: Uint8Array): void;
        };
        exec(): Promise<[unknown, unknown]>;
      }>;
      const batcher = new Batcher(1, nodes, flowContract, config.rpcUrl);
      batcher.streamDataBuilder.set(config.streamId, keyBytes, valueBytes);
      const [, err] = await batcher.exec();

      if (err) {
        throw new Error(`0G KV put failed: ${formatError(err)}`);
      }
    },
    async get<T>(key: string) {
      validateKvReadConfig(config);
      const zeroG = await loadZeroGSdk();

      if (typeof zeroG.KvClient !== "function") {
        throw new Error("0G KV get requires KvClient export from @0gfoundation/0g-ts-sdk");
      }

      const KvClient = zeroG.KvClient as UnknownConstructor<{
        getValue(streamId: string, key: Uint8Array): Promise<unknown>;
      }>;
      const kvClient = new KvClient(config.kvNodeUrl);
      const value = await kvClient.getValue(config.streamId, bytesFromString(key));

      if (
        value === null ||
        value === undefined ||
        value === "" ||
        (typeof value === "object" &&
          value !== null &&
          typeof (value as { data?: unknown }).data === "string" &&
          (value as { data: string }).data.length === 0)
      ) {
        return null;
      }

      const raw = decodeKvValue(value);
      return JSON.parse(raw) as T;
    }
  };
}

function validateBlobConfig(config: ZeroGBlobStorageAdapterConfig): void {
  validateBlobReadConfig(config);
  if (!config.rpcUrl || !config.privateKey) {
    throw new Error("0G blob put requires rpcUrl, indexerRpcUrl, and privateKey");
  }
}

function validateBlobReadConfig(config: ZeroGBlobStorageAdapterConfig): void {
  if (!config.indexerRpcUrl) {
    throw new Error("0G blob adapter requires indexerRpcUrl");
  }
}

function validateKvReadConfig(config: ZeroGKvAdapterConfig): void {
  if (!config.kvNodeUrl || !config.streamId) {
    throw new Error("0G KV adapter requires kvNodeUrl and streamId");
  }
}

function validateKvWriteConfig(config: ZeroGKvAdapterConfig): void {
  validateKvReadConfig(config);
  if (!config.rpcUrl || !config.indexerRpcUrl || !config.privateKey) {
    throw new Error("0G KV put requires rpcUrl, indexerRpcUrl, privateKey, kvNodeUrl, and streamId");
  }
}

async function loadZeroGDeps(): Promise<{ zeroG: OptionalModule; ethers: OptionalModule }> {
  const [zeroG, ethers] = await Promise.all([loadZeroGSdk(), loadEthers()]);
  return { zeroG, ethers };
}

async function loadZeroGSdk(): Promise<OptionalModule> {
  try {
    return await optionalImport("@0gfoundation/0g-ts-sdk");
  } catch (foundationError) {
    try {
      return await optionalImport("@0glabs/0g-ts-sdk");
    } catch (labsError) {
      throw new Error(
        "0G adapter requires optional dependency @0gfoundation/0g-ts-sdk or @0glabs/0g-ts-sdk; install it to use the real 0G provider",
        { cause: labsError ?? foundationError }
      );
    }
  }
}

async function loadEthers(): Promise<OptionalModule> {
  try {
    return await optionalImport("ethers");
  } catch (error) {
    throw new Error("0G adapter requires optional dependency ethers; install it to use the real 0G provider", {
      cause: error
    });
  }
}

async function writeTempJson(tempDir: string | undefined, value: unknown): Promise<string> {
  const dir = await mkdtemp(join(tempDir ?? tmpdir(), "otm-0g-"));
  const path = join(dir, "blob.json");
  await writeFile(path, `${JSON.stringify(value)}\n`, "utf8");
  return path;
}

async function createZgFile(zeroG: OptionalModule, path: string) {
  const zgFile = zeroG.ZgFile;
  if (!isObjectWithFunction(zgFile, "fromFilePath")) {
    throw new Error("0G blob adapter requires ZgFile.fromFilePath from the 0G TypeScript SDK");
  }
  return zgFile.fromFilePath(path);
}

async function getMerkleTree(file: unknown) {
  if (!isObjectWithFunction(file, "merkleTree")) {
    throw new Error("0G blob adapter requires uploaded files to expose merkleTree()");
  }
  const [tree, err] = (await file.merkleTree()) as [unknown, unknown];
  if (err) {
    throw new Error(`0G blob merkle tree failed: ${formatError(err)}`);
  }
  if (!isObjectWithFunction(tree, "rootHash")) {
    throw new Error("0G blob merkle tree did not expose rootHash()");
  }
  return tree;
}

async function closeZgFile(file: unknown): Promise<void> {
  if (isObjectWithFunction(file, "close")) {
    await file.close();
  }
}

function createIndexer(zeroG: OptionalModule, indexerRpcUrl: string | undefined) {
  if (!indexerRpcUrl) {
    throw new Error("0G adapter requires indexerRpcUrl for this operation");
  }
  if (typeof zeroG.Indexer !== "function") {
    throw new Error("0G adapter requires Indexer export from the 0G TypeScript SDK");
  }
  const Indexer = zeroG.Indexer as UnknownConstructor<{
    upload(file: unknown, rpcUrl: string, signer: unknown): Promise<[unknown, unknown]>;
    download(rootHash: string, outputPath: string, withProof: boolean): Promise<unknown>;
    selectNodes(count: number): Promise<[unknown, unknown]>;
  }>;
  return new Indexer(indexerRpcUrl);
}

function createSigner(ethers: OptionalModule, rpcUrl: string, privateKey: string) {
  if (typeof ethers.JsonRpcProvider !== "function" || typeof ethers.Wallet !== "function") {
    throw new Error("0G adapter requires ethers JsonRpcProvider and Wallet exports");
  }
  const JsonRpcProvider = ethers.JsonRpcProvider as UnknownConstructor<unknown>;
  const Wallet = ethers.Wallet as UnknownConstructor<unknown>;
  const provider = new JsonRpcProvider(rpcUrl);
  return new Wallet(privateKey, provider);
}

function createFlowContract(zeroG: OptionalModule, ethers: OptionalModule, config: ZeroGKvAdapterConfig) {
  if (typeof zeroG.getFlowContract !== "function") {
    throw new Error("0G KV put requires flowContract config or getFlowContract export from the 0G TypeScript SDK");
  }
  if (!config.rpcUrl || !config.privateKey) {
    throw new Error("0G KV put requires rpcUrl and privateKey to create a flow contract");
  }
  const signer = createSigner(ethers, config.rpcUrl, config.privateKey);
  return zeroG.getFlowContract(DEFAULT_0G_FLOW_CONTRACT, signer);
}

function parseRootUri(uri: string): string {
  const prefix = "0g://root/";
  if (!uri.startsWith(prefix)) {
    throw new Error(`Unsupported 0G blob URI: ${uri}. Expected 0g://root/<rootHash>`);
  }
  const rootHash = uri.slice(prefix.length);
  if (!rootHash) {
    throw new Error("Unsupported 0G blob URI: missing root hash");
  }
  return rootHash;
}

function bytesFromString(value: string): Uint8Array {
  return Uint8Array.from(Buffer.from(value, "utf8"));
}

function decodeKvValue(value: unknown): string {
  if (
    typeof value === "object" &&
    value !== null &&
    typeof (value as { data?: unknown }).data === "string"
  ) {
    return Buffer.from((value as { data: string }).data, "base64").toString("utf8");
  }
  if (typeof value === "string") {
    return Buffer.from(value, "base64").toString("utf8");
  }
  if (value instanceof Uint8Array) {
    return Buffer.from(value).toString("utf8");
  }
  if (Array.isArray(value) && value.every((item) => typeof item === "number")) {
    return Buffer.from(value).toString("utf8");
  }
  throw new Error(`0G KV get returned an unsupported value type: ${typeof value}`);
}

function isObjectWithFunction<TName extends string>(
  value: unknown,
  name: TName
): value is Record<TName, UnknownFunction> {
  return (
    (typeof value === "object" || typeof value === "function") &&
    value !== null &&
    typeof (value as Record<TName, unknown>)[name] === "function"
  );
}

function formatError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

const optionalImport = new Function("specifier", "return import(specifier)") as (
  specifier: string
) => Promise<OptionalModule>;
