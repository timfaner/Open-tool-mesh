import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { resolve } from "node:path";

const DEFAULT_ENV_FILE = ".env.provider";
const sdkRequire = createRequire(new URL("../packages/sdk/package.json", import.meta.url));

type EnvMap = Record<string, string | undefined>;

interface PreflightArgs {
  envFile: string;
  network: boolean;
}

interface CheckResult {
  name: string;
  ok: boolean;
  detail: string;
}

async function main() {
  const rootDir = new URL("..", import.meta.url).pathname;
  const args = parseArgs(process.argv.slice(2));
  const env = {
    ...process.env,
    ...(await readEnvFile(resolve(rootDir, args.envFile)))
  };
  const checks: CheckResult[] = [];

  checks.push(validateProviderEnv(env));
  checks.push(...(await checkProviderDependencies()));

  if (args.network) {
    checks.push(await checkJsonRpc("ENS RPC", requireEnv(env, "OTM_ENS_RPC_URL"), "eth_chainId", []));
    checks.push(await checkJsonRpc("0G EVM RPC", requireEnv(env, "OTM_0G_RPC_URL"), "eth_chainId", []));
    checks.push(await check0GKvStatus(env));
    checks.push(await checkAxlEndpoint(env));
  }

  const ok = checks.every((check) => check.ok);
  console.log(JSON.stringify({ ok, checks }, null, 2));

  if (!ok) {
    process.exitCode = 1;
  }
}

function parseArgs(argv: string[]): PreflightArgs {
  return {
    envFile: readFlag(argv, "--env", DEFAULT_ENV_FILE),
    network: !argv.includes("--no-network")
  };
}

function readFlag(argv: string[], name: string, fallback: string): string {
  const index = argv.indexOf(name);
  if (index === -1) {
    return fallback;
  }
  const value = argv[index + 1]?.trim();
  if (!value || value.startsWith("--")) {
    throw new Error(`Missing value for ${name}`);
  }
  return value;
}

async function readEnvFile(path: string): Promise<EnvMap> {
  let source: string;
  try {
    source = await readFile(path, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      throw new Error(`Missing ${path}. Create it from .env.provider.example and keep it local.`);
    }
    throw error;
  }

  const env: EnvMap = {};
  for (const [lineNumber, rawLine] of source.split(/\r?\n/).entries()) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }

    const match = /^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)=(.*)$/.exec(line);
    if (!match) {
      throw new Error(`Invalid provider env line ${lineNumber + 1}: expected KEY=value`);
    }

    env[match[1]] = unquoteEnvValue(match[2].trim());
  }
  return env;
}

function unquoteEnvValue(value: string): string {
  if (
    (value.startsWith("\"") && value.endsWith("\"")) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }
  return value;
}

function validateProviderEnv(env: EnvMap): CheckResult {
  const errors: string[] = [];

  requireExact(env, "OTM_PROVIDER_PROFILE", "provider-testnet", errors);
  requireExact(env, "OTM_ENS_PROVIDER", "ens", errors);
  requireExact(env, "OTM_STORAGE_PROVIDER", "0g", errors);
  requireUrl(env, "OTM_ENS_RPC_URL", errors);
  requireValue(env, "OTM_ENS_NAME", errors);
  requirePrivateKey(env, "OTM_ENS_PUBLISHER_PRIVATE_KEY", errors);
  requireUrl(env, "OTM_0G_RPC_URL", errors);
  requireAnyUrl(env, ["OTM_0G_INDEXER_RPC", "OTM_0G_INDEXER_URL"], errors);
  requirePrivateKey(env, "OTM_0G_PRIVATE_KEY", errors);
  requireUrl(env, "OTM_0G_KV_NODE_URL", errors);
  requireHex32(env, "OTM_0G_KV_STREAM_ID", errors);
  requireAnyUrl(env, ["OTM_GENSYN_AXL_API_URL", "OTM_GENSYN_AXL_ENDPOINT_URL"], errors);

  const ownerAddress = env.OTM_TOOL_OWNER_ADDRESS?.trim();
  if (ownerAddress && !/^0x[a-fA-F0-9]{40}$/.test(ownerAddress)) {
    errors.push("Invalid OTM_TOOL_OWNER_ADDRESS: expected a 20-byte hex address");
  }

  return {
    name: "provider environment",
    ok: errors.length === 0,
    detail: errors.length === 0 ? "required provider environment variables are present" : errors.join("; ")
  };
}

async function checkProviderDependencies(): Promise<CheckResult[]> {
  const specs = ["viem", "viem/chains", "ethers", "@0gfoundation/0g-ts-sdk"];
  return Promise.all(
    specs.map(async (specifier) => {
      try {
        await importSdkDependency(specifier);
        return {
          name: `dependency ${specifier}`,
          ok: true,
          detail: "importable"
        };
      } catch (error) {
        return {
          name: `dependency ${specifier}`,
          ok: false,
          detail: error instanceof Error ? error.message : String(error)
        };
      }
    })
  );
}

async function checkJsonRpc(name: string, url: string, method: string, params: unknown[]): Promise<CheckResult> {
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: `otm-preflight-${Date.now()}`,
        method,
        params
      })
    });
    const body = (await response.json()) as { result?: unknown; error?: { message?: string } };

    if (!response.ok || body.error) {
      return {
        name,
        ok: false,
        detail: body.error?.message ?? `HTTP ${response.status}`
      };
    }

    return {
      name,
      ok: true,
      detail: `${method} returned ${String(body.result)}`
    };
  } catch (error) {
    return {
      name,
      ok: false,
      detail: error instanceof Error ? error.message : String(error)
    };
  }
}

async function check0GKvStatus(env: EnvMap): Promise<CheckResult> {
  const kvNodeUrl = requireEnv(env, "OTM_0G_KV_NODE_URL");
  const streamId = requireEnv(env, "OTM_0G_KV_STREAM_ID").replace(/^0x/, "").toLowerCase();
  const status = await checkJsonRpc("0G KV status", kvNodeUrl, "kv_getStatus", []);

  if (!status.ok) {
    return status;
  }

  try {
    const response = await fetch(kvNodeUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: `otm-preflight-${Date.now()}`,
        method: "kv_getHoldingStreamIds",
        params: []
      })
    });
    const body = (await response.json()) as { result?: unknown; error?: { message?: string } };

    if (!response.ok || body.error) {
      return {
        name: "0G KV stream",
        ok: false,
        detail: body.error?.message ?? `HTTP ${response.status}`
      };
    }

    const streamIds = Array.isArray(body.result) ? body.result.map((value) => String(value).replace(/^0x/, "").toLowerCase()) : [];
    const containsStream = streamIds.includes(streamId);
    return {
      name: "0G KV stream",
      ok: containsStream,
      detail: containsStream
        ? "configured stream is held by the KV node"
        : "configured stream was not returned by kv_getHoldingStreamIds"
    };
  } catch (error) {
    return {
      name: "0G KV stream",
      ok: false,
      detail: error instanceof Error ? error.message : String(error)
    };
  }
}

async function checkAxlEndpoint(env: EnvMap): Promise<CheckResult> {
  const baseUrl = requireEnv(env, "OTM_GENSYN_AXL_API_URL", "OTM_GENSYN_AXL_ENDPOINT_URL").replace(/\/$/, "");

  try {
    const bridgeResponse = await fetch(`${baseUrl}/health`);
    if (bridgeResponse.ok) {
      const body = (await bridgeResponse.json()) as { capability?: string; ok?: boolean };
      return {
        name: "AXL bridge",
        ok: body.ok === true,
        detail: body.capability ? `tool bridge reports ${body.capability}` : "bridge health responded"
      };
    }
  } catch {
    // If this is a real AXL node instead of the local tool bridge, try topology next.
  }

  try {
    const topologyResponse = await fetch(`${baseUrl}/topology`);
    return {
      name: "AXL node",
      ok: topologyResponse.ok,
      detail: topologyResponse.ok ? "topology endpoint responded" : `HTTP ${topologyResponse.status}`
    };
  } catch (error) {
    return {
      name: "AXL endpoint",
      ok: false,
      detail: error instanceof Error ? error.message : String(error)
    };
  }
}

function requireExact(env: EnvMap, name: string, expected: string, errors: string[]): void {
  const value = env[name]?.trim();
  if (!value) {
    errors.push(`Missing ${name}; expected ${expected}`);
    return;
  }
  if (value !== expected) {
    errors.push(`Invalid ${name}: expected ${expected}, got ${value}`);
  }
}

function requireValue(env: EnvMap, name: string, errors?: string[]): string {
  const value = env[name]?.trim();
  if (!value || isPlaceholder(value)) {
    const message = `Missing or placeholder ${name}`;
    if (errors) {
      errors.push(message);
      return "";
    }
    throw new Error(message);
  }
  return value;
}

function requireEnv(env: EnvMap, ...names: string[]): string {
  for (const name of names) {
    const value = env[name]?.trim();
    if (value && !isPlaceholder(value)) {
      return value;
    }
  }
  throw new Error(`Missing required environment variable ${names.join(" or ")}`);
}

function requireUrl(env: EnvMap, name: string, errors: string[]): void {
  const value = requireValue(env, name, errors);
  if (!value) {
    return;
  }
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      errors.push(`Invalid ${name}: expected http(s) URL`);
    }
  } catch {
    errors.push(`Invalid ${name}: expected http(s) URL`);
  }
}

function requireAnyUrl(env: EnvMap, names: string[], errors: string[]): void {
  for (const name of names) {
    const value = env[name]?.trim();
    if (value && !isPlaceholder(value)) {
      requireUrl(env, name, errors);
      return;
    }
  }
  errors.push(`Missing one of ${names.join(" or ")}`);
}

function requirePrivateKey(env: EnvMap, name: string, errors: string[]): void {
  const value = requireValue(env, name, errors);
  if (!value) {
    return;
  }
  if (!/^0x[a-fA-F0-9]{64}$/.test(value)) {
    errors.push(`Invalid ${name}: expected a 32-byte hex private key`);
  }
  if (/^0x([a-fA-F0-9])\1{63}$/.test(value)) {
    errors.push(`Invalid ${name}: repeated hex digit looks like a placeholder`);
  }
}

function requireHex32(env: EnvMap, name: string, errors: string[]): void {
  const value = requireValue(env, name, errors);
  if (!value) {
    return;
  }
  if (!/^0x[a-fA-F0-9]{64}$/.test(value)) {
    errors.push(`Invalid ${name}: expected a 32-byte hex string`);
  }
}

function isPlaceholder(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  return (
    normalized === "" ||
    normalized.includes("<") ||
    normalized.includes(">") ||
    normalized.includes("...") ||
    normalized.includes("changeme") ||
    normalized.includes("replace_me") ||
    normalized.includes("your_") ||
    normalized.includes("example")
  );
}

const optionalImport = new Function("specifier", "return import(specifier)") as (
  specifier: string
) => Promise<unknown>;

async function importSdkDependency(specifier: string): Promise<unknown> {
  return optionalImport(sdkRequire.resolve(specifier));
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
