import { resolve } from "node:path";

export type ProviderProfile = "local" | "provider-testnet" | "provider-mainnet";

export type ProviderEnv = Record<string, string | undefined>;

export interface LocalProviderConfig {
  profile: "local";
  rootDir: string;
}

export interface NetworkProviderConfig {
  profile: "provider-testnet" | "provider-mainnet";
  network: "testnet" | "mainnet";
  ens: {
    provider: "ens";
    rpcUrl: string;
    name?: string;
    publisherPrivateKey?: `0x${string}`;
  };
  zeroG: {
    provider: "0g";
    rpcUrl: string;
    indexerRpcUrl: string;
    privateKey: `0x${string}`;
    kvNodeUrl: string;
    kvStreamId: `0x${string}`;
  };
  gensynAxl: {
    apiUrl: string;
  };
}

export type ProviderConfig = LocalProviderConfig | NetworkProviderConfig;

const DEFAULT_PROFILE: ProviderProfile = "local";

export function createProviderConfigFromEnv(env: ProviderEnv, rootDir: string): ProviderConfig {
  const profile = readProfile(env);

  if (profile === "local") {
    return {
      profile,
      rootDir: resolve(rootDir)
    };
  }

  const network = profile === "provider-mainnet" ? "mainnet" : "testnet";

  return {
    profile,
    network,
    ens: {
      provider: readProvider(env, "OTM_ENS_PROVIDER", "ens"),
      rpcUrl: readRequiredUrl(env, "OTM_ENS_RPC_URL"),
      name: readOptional(env, "OTM_ENS_NAME"),
      publisherPrivateKey: readOptionalHex(env, "OTM_ENS_PUBLISHER_PRIVATE_KEY")
    },
    zeroG: {
      provider: readProvider(env, "OTM_STORAGE_PROVIDER", "0g"),
      rpcUrl: readRequiredUrl(env, "OTM_0G_RPC_URL"),
      indexerRpcUrl: readRequiredAnyUrl(env, ["OTM_0G_INDEXER_RPC", "OTM_0G_INDEXER_URL"]),
      privateKey: readRequiredHex(env, "OTM_0G_PRIVATE_KEY"),
      kvNodeUrl: readRequiredUrl(env, "OTM_0G_KV_NODE_URL"),
      kvStreamId: readRequiredHex32(env, "OTM_0G_KV_STREAM_ID")
    },
    gensynAxl: {
      apiUrl: readRequiredAnyUrl(env, ["OTM_GENSYN_AXL_API_URL", "OTM_GENSYN_AXL_ENDPOINT_URL"])
    }
  };
}

function readProfile(env: ProviderEnv): ProviderProfile {
  const raw = readOptional(env, "OTM_PROVIDER_PROFILE") ?? DEFAULT_PROFILE;
  if (raw === "local" || raw === "provider-testnet" || raw === "provider-mainnet") {
    return raw;
  }
  throw new Error(
    `Invalid OTM_PROVIDER_PROFILE "${raw}". Expected local, provider-testnet, or provider-mainnet.`
  );
}

function readRequired(env: ProviderEnv, name: string): string {
  const value = readOptional(env, name);
  if (!value) {
    throw new Error(`Missing required provider environment variable ${name}`);
  }
  return value;
}

function readRequiredAny(env: ProviderEnv, names: readonly string[]): string {
  for (const name of names) {
    const value = readOptional(env, name);
    if (value) {
      return value;
    }
  }
  throw new Error(`Missing required provider environment variable ${names.join(" or ")}`);
}

function readRequiredUrl(env: ProviderEnv, name: string): string {
  return validateUrl(readRequired(env, name), name);
}

function readRequiredAnyUrl(env: ProviderEnv, names: readonly string[]): string {
  const value = readRequiredAny(env, names);
  return validateUrl(value, names.join(" or "));
}

function readOptional(env: ProviderEnv, name: string): string | undefined {
  const value = env[name]?.trim();
  return value ? value : undefined;
}

function readProvider<TExpected extends string>(
  env: ProviderEnv,
  name: string,
  expected: TExpected
): TExpected {
  const value = readOptional(env, name) ?? expected;
  if (value !== expected) {
    throw new Error(`Invalid ${name}: expected ${expected}`);
  }
  return expected;
}

function readOptionalHex(env: ProviderEnv, name: string): `0x${string}` | undefined {
  const value = readOptional(env, name);
  if (!value) {
    return undefined;
  }
  return validateHex(value, name);
}

function readRequiredHex(env: ProviderEnv, name: string): `0x${string}` {
  return validateHex(readRequired(env, name), name);
}

function readRequiredHex32(env: ProviderEnv, name: string): `0x${string}` {
  const value = validateHex(readRequired(env, name), name);
  if (!/^0x[a-fA-F0-9]{64}$/.test(value)) {
    throw new Error(`Invalid ${name}: expected a 32-byte hex string`);
  }
  return value;
}

function validateHex(value: string, name: string): `0x${string}` {
  if (!/^0x[a-fA-F0-9]+$/.test(value)) {
    throw new Error(`Invalid ${name}: expected a hex string`);
  }
  return value as `0x${string}`;
}

function validateUrl(value: string, name: string): string {
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      throw new Error("unsupported protocol");
    }
    return value;
  } catch {
    throw new Error(`Invalid ${name}: expected an http(s) URL`);
  }
}
