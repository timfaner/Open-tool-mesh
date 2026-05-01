import { execFile } from "node:child_process";
import { constants as fsConstants } from "node:fs";
import { access, readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const DEFAULT_ENV_FILE = ".env.provider";
const DEFAULT_MANIFEST = "manifests/solidity-pattern-scanner.manifest.json";
const DEFAULT_INPUT = "examples/audit-agent/fixtures/sample-contract-input.json";
const SDK_DIST_ENTRY = "packages/sdk/dist/sdk/src/index.js";
const SDK_SOURCE_ENTRY = "packages/sdk/src/index.ts";

type EnvMap = Record<string, string | undefined>;

interface SmokeArgs {
  envFile: string;
  manifestPath: string;
  inputPath: string;
  call: boolean;
  sdkVersion: string;
}

async function main() {
  const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const args = parseArgs(process.argv.slice(2));
  const env = {
    ...process.env,
    ...(await readEnvFile(resolve(rootDir, args.envFile)))
  };
  const shouldCall = args.call || env.OTM_PROVIDER_SMOKE_CALL === "true";

  validateProviderEnv(env);

  const sdk = await loadSdk(rootDir);
  const config = sdk.createProviderConfigFromEnv(env, rootDir);
  const client = sdk.createOpenToolMeshClient(sdk.createProviderClientDeps(config));
  const manifest = await readSmokeManifest(rootDir, args.manifestPath, env, sdk.hashManifest);

  const publish = await client.publishManifest({ manifest });
  const ensName = requireValue(env, "OTM_ENS_NAME");
  const identity = await client.resolveIdentity({ ensName });
  const resolvedManifest = await client.loadManifest({ manifestUri: identity.latestManifestUri });
  const verification = await client.verifyManifest({
    identity,
    manifest: resolvedManifest,
    sdkVersion: args.sdkVersion
  });

  const result: Record<string, unknown> = {
    profile: config.profile,
    publish: {
      manifestUri: publish.manifestUri,
      manifestHash: publish.manifestHash,
      version: publish.version
    },
    resolve: {
      ensName: identity.ensName,
      ownerAddress: identity.ownerAddress,
      latestManifestUri: identity.latestManifestUri,
      latestManifestHash: identity.latestManifestHash,
      latestVersion: identity.latestVersion,
      capabilities: identity.capabilities
    },
    verify: verification
  };

  if (!verification.ok) {
    throw new Error(`Provider smoke verify failed: ${verification.errors.join(", ")}`);
  }

  if (shouldCall) {
    const input = await readCallInput(rootDir, args.inputPath);
    const capability = resolvedManifest.capabilities[0]?.id;
    if (!capability) {
      throw new Error("Provider smoke call requires at least one manifest capability");
    }

    result.call = await client.invokeTool({
      capability,
      tool: identity,
      manifest: resolvedManifest,
      agentId: "provider-live-smoke",
      input,
      traceId: `provider-smoke-${Date.now()}`
    });
  } else {
    result.call = {
      skipped: true,
      reason: "Pass --call or set OTM_PROVIDER_SMOKE_CALL=true to invoke the provider transport."
    };
  }

  console.log(JSON.stringify(result, null, 2));
}

function parseArgs(argv: string[]): SmokeArgs {
  return {
    envFile: readFlag(argv, "--env", DEFAULT_ENV_FILE),
    manifestPath: readFlag(argv, "--manifest", DEFAULT_MANIFEST),
    inputPath: readFlag(argv, "--input", DEFAULT_INPUT),
    call: argv.includes("--call"),
    sdkVersion: readFlag(argv, "--sdk-version", "0.1.0")
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
      throw new Error(`Missing ${path}. Create it locally from the docs template; do not commit real provider secrets.`);
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
      throw new Error(`Invalid .env.provider line ${lineNumber + 1}: expected KEY=value`);
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

function validateProviderEnv(env: EnvMap): void {
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

  if (errors.length > 0) {
    throw new Error(`Provider smoke environment is not ready:\n- ${errors.join("\n- ")}`);
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

async function loadSdk(rootDir: string) {
  const distEntry = resolve(rootDir, SDK_DIST_ENTRY);
  if (!(await fileExists(distEntry))) {
    await execFileAsync("corepack", ["pnpm", "--filter", "@opentoolmesh/sdk", "build"], { cwd: rootDir });
  }

  if (await fileExists(distEntry)) {
    return import(distEntry);
  }

  return import(resolve(rootDir, SDK_SOURCE_ENTRY));
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path, fsConstants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function readSmokeManifest(
  rootDir: string,
  manifestPath: string,
  env: EnvMap,
  hashManifest: (manifest: Record<string, unknown>) => string
) {
  const manifest = JSON.parse(await readFile(resolve(rootDir, manifestPath), "utf8")) as Record<string, unknown>;
  const ensName = requireValue(env, "OTM_ENS_NAME");
  const ownerAddress = env.OTM_TOOL_OWNER_ADDRESS?.trim() ?? await deriveAddressFromPrivateKey(requireValue(env, "OTM_ENS_PUBLISHER_PRIVATE_KEY"));

  manifest.toolId = `otm:ens:${ensName}`;
  manifest.owner = {
    ...(typeof manifest.owner === "object" && manifest.owner !== null ? manifest.owner : {}),
    ...(ownerAddress ? { address: ownerAddress } : {}),
    ensName
  };

  const integrity =
    typeof manifest.integrity === "object" && manifest.integrity !== null
      ? (manifest.integrity as Record<string, unknown>)
      : {};
  integrity.manifestHash = hashManifest(manifest);
  manifest.integrity = integrity;

  return manifest;
}

async function deriveAddressFromPrivateKey(privateKey: string): Promise<string> {
  const { Wallet } = await import("ethers");
  return new Wallet(privateKey).address;
}

async function readCallInput(rootDir: string, inputPath: string): Promise<Record<string, unknown>> {
  const rawInput = JSON.parse(await readFile(resolve(rootDir, inputPath), "utf8")) as {
    source?: string;
    sourceFile?: string;
  };
  const source = rawInput.source ?? (rawInput.sourceFile ? await readFile(resolve(rootDir, rawInput.sourceFile), "utf8") : undefined);

  if (!source) {
    throw new Error("Provider smoke call input must contain source or sourceFile");
  }

  return { source };
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
