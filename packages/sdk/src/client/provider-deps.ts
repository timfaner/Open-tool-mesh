import type {
  BlobStorageAdapter,
  EnsAdapter,
  InvocationTransport,
  KvIndexAdapter,
  OpenToolMeshClientDeps
} from "./create-client.js";
import { createLocalDevnetClientDeps } from "./local-devnet.js";
import type { NetworkProviderConfig, ProviderConfig } from "./provider-config.js";
import { createEnsResolverAdapter } from "./providers/ens.js";
import { createGensynAxlInvocationTransport as createGensynAxlProviderTransport } from "./providers/gensyn-axl.js";
import {
  createZeroGBlobStorageAdapter as createZeroGProviderBlobStorageAdapter,
  createZeroGKvAdapter
} from "./providers/zero-g.js";

export function createProviderClientDeps(config: ProviderConfig): OpenToolMeshClientDeps {
  if (config.profile === "local") {
    return createLocalDevnetClientDeps(config.rootDir);
  }

  return {
    ens: createProviderEnsAdapter(config),
    blob: createZeroGBlobStorageAdapter(config),
    kv: createZeroGKvIndexAdapter(config),
    transport: createGensynAxlInvocationTransport(config)
  };
}

export function createProviderEnsAdapter(config: NetworkProviderConfig): EnsAdapter {
  return createEnsResolverAdapter({
    rpcUrl: config.ens.rpcUrl,
    walletPrivateKey: config.ens.publisherPrivateKey
  });
}

export function createZeroGBlobStorageAdapter(config: NetworkProviderConfig): BlobStorageAdapter {
  return createZeroGProviderBlobStorageAdapter({
    rpcUrl: config.zeroG.rpcUrl,
    indexerRpcUrl: config.zeroG.indexerRpcUrl,
    privateKey: config.zeroG.privateKey
  });
}

export function createZeroGKvIndexAdapter(config: NetworkProviderConfig): KvIndexAdapter {
  return createZeroGKvAdapter({
    rpcUrl: config.zeroG.rpcUrl,
    indexerRpcUrl: config.zeroG.indexerRpcUrl,
    privateKey: config.zeroG.privateKey,
    kvNodeUrl: config.zeroG.kvNodeUrl,
    streamId: config.zeroG.kvStreamId
  });
}

export function createGensynAxlInvocationTransport(
  config: NetworkProviderConfig
): InvocationTransport {
  return createGensynAxlProviderTransport({
    baseUrl: config.gensynAxl.apiUrl
  });
}
