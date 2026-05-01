import type { EnsAdapter } from "../create-client.js";

const DEFAULT_OTM_TEXT_RECORD_KEYS = [
  "opentoolmesh.manifest_uri",
  "opentoolmesh.manifest_hash",
  "opentoolmesh.owner",
  "opentoolmesh.latest_version",
  "opentoolmesh.capabilities"
] as const;

type OptionalModule = Record<string, unknown>;

export interface EnsResolverAdapterConfig {
  rpcUrl: string;
  chain?: unknown;
  textRecordKeys?: readonly string[];
  walletPrivateKey?: `0x${string}`;
  resolverAddress?: `0x${string}`;
  waitForTransactionReceipt?: boolean;
}

export function createEnsResolverAdapter(config: EnsResolverAdapterConfig): EnsAdapter {
  return {
    async resolveTextRecords(ensName) {
      const viem = await loadViem();
      const client = createPublicClient(viem, config);
      const name = normalizeEnsName(viem, ensName);
      const records: Record<string, string | undefined> = {};

      for (const key of config.textRecordKeys ?? DEFAULT_OTM_TEXT_RECORD_KEYS) {
        if (!key.startsWith("opentoolmesh.")) {
          continue;
        }
        records[key] = (await client.getEnsText({ name, key })) ?? undefined;
      }

      return records;
    },
    async resolveOwner(ensName) {
      const viem = await loadViem();
      const client = createPublicClient(viem, config);
      const name = normalizeEnsName(viem, ensName);
      const owner = await client.getEnsText({ name, key: "opentoolmesh.owner" });
      if (isHexAddress(owner)) {
        return owner;
      }

      try {
        const address = await client.getEnsAddress({ name });
        if (isHexAddress(address)) {
          return address;
        }
      } catch {
        // Some ENS names used for tools may not have an address record. Fall
        // back to the OTM owner text record when present.
      }

      return null;
    },
    async setTextRecords(ensName, records) {
      if (!config.walletPrivateKey) {
        throw new Error("ENS setTextRecords requires walletPrivateKey in the adapter config");
      }

      const viem = await loadViem();
      const accounts = await loadViemAccounts();
      const publicClient = createPublicClient(viem, config);
      const resolverAddress = config.resolverAddress ?? (await publicClient.getEnsResolver?.({ name: ensName }));

      if (!isHexAddress(resolverAddress)) {
        throw new Error("ENS setTextRecords requires resolverAddress or a resolvable ENS resolver");
      }
      if (typeof accounts.privateKeyToAccount !== "function") {
        throw new Error("ENS setTextRecords requires viem/accounts privateKeyToAccount");
      }
      if (
        typeof viem.createWalletClient !== "function" ||
        typeof viem.http !== "function" ||
        typeof viem.namehash !== "function"
      ) {
        throw new Error("ENS setTextRecords requires viem exports createWalletClient, http, and namehash");
      }

      const account = accounts.privateKeyToAccount(config.walletPrivateKey);
      const walletClient = viem.createWalletClient({
        account,
        chain: config.chain,
        transport: viem.http(config.rpcUrl)
      }) as {
        writeContract(input: {
          address: `0x${string}`;
          abi: typeof publicResolverSetTextAbi;
          functionName: "setText";
          args: readonly [string, string, string];
        }): Promise<string>;
      };
      const name = normalizeEnsName(viem, ensName);
      const node = viem.namehash(name) as string;

      for (const [key, value] of Object.entries(records)) {
        if (!key.startsWith("opentoolmesh.")) {
          throw new Error(`ENS text record key must use opentoolmesh.* prefix: ${key}`);
        }

        const hash = await walletClient.writeContract({
          address: resolverAddress,
          abi: publicResolverSetTextAbi,
          functionName: "setText",
          args: [node, key, value]
        });

        if (config.waitForTransactionReceipt !== false && typeof publicClient.waitForTransactionReceipt === "function") {
          await publicClient.waitForTransactionReceipt({ hash });
        }
      }
    }
  };
}

function createPublicClient(viem: OptionalModule, config: EnsResolverAdapterConfig) {
  if (typeof viem.createPublicClient !== "function" || typeof viem.http !== "function") {
    throw new Error("ENS adapter requires viem exports createPublicClient and http");
  }

  return viem.createPublicClient({
    chain: config.chain,
    transport: viem.http(config.rpcUrl)
  }) as {
    getEnsText(input: { name: string; key: string }): Promise<string | null | undefined>;
    getEnsAddress(input: { name: string }): Promise<string | null | undefined>;
    getEnsResolver?(input: { name: string }): Promise<string | null | undefined>;
    waitForTransactionReceipt?(input: { hash: string }): Promise<unknown>;
  };
}

function normalizeEnsName(viem: OptionalModule, ensName: string): string {
  return typeof viem.normalize === "function" ? (viem.normalize(ensName) as string) : ensName;
}

function isHexAddress(value: unknown): value is `0x${string}` {
  return typeof value === "string" && /^0x[a-fA-F0-9]{40}$/.test(value);
}

async function loadViem(): Promise<OptionalModule> {
  try {
    return await optionalImport("viem");
  } catch (error) {
    throw optionalDependencyError("viem", error);
  }
}

async function loadViemAccounts(): Promise<OptionalModule> {
  try {
    return await optionalImport("viem/accounts");
  } catch (error) {
    throw optionalDependencyError("viem/accounts", error);
  }
}

function optionalDependencyError(packageName: string, cause: unknown): Error {
  return new Error(`ENS adapter requires optional dependency ${packageName}; install it to use the real ENS provider`, {
    cause
  });
}

const optionalImport = new Function("specifier", "return import(specifier)") as (
  specifier: string
) => Promise<OptionalModule>;

const publicResolverSetTextAbi = [
  {
    type: "function",
    name: "setText",
    stateMutability: "nonpayable",
    inputs: [
      { name: "node", type: "bytes32" },
      { name: "key", type: "string" },
      { name: "value", type: "string" }
    ],
    outputs: []
  }
] as const;
