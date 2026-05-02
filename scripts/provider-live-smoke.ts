import { execFile } from "node:child_process";
import { constants as fsConstants } from "node:fs";
import { randomUUID } from "node:crypto";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import type { AuditReport, ExecutionTrace } from "@opentoolmesh/shared";

const execFileAsync = promisify(execFile);

const DEFAULT_ENV_FILE = ".env.provider";
const DEFAULT_MANIFEST = "manifests/solidity-pattern-scanner.manifest.json";
const DEFAULT_INPUT = "examples/audit-agent/fixtures/sample-contract-input.json";
const SDK_DIST_ENTRY = "packages/sdk/dist/sdk/src/index.js";
const SDK_SOURCE_ENTRY = "packages/sdk/src/index.ts";
const sdkRequire = createRequire(new URL("../packages/sdk/package.json", import.meta.url));

type EnvMap = Record<string, string | undefined>;

interface SmokeArgs {
  envFile: string;
  manifestPath: string;
  inputPath: string;
  call: boolean;
  sdkVersion: string;
}

interface ScannerFinding {
  ruleId?: string;
  severity?: "low" | "medium" | "high" | "critical";
  title?: string;
  message?: string;
}

interface ScannerOutput {
  findings?: ScannerFinding[];
  summary?: Record<string, number>;
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
  const requestedCapability = getManifestCapability(manifest);
  const discovered = await client.discoverTools({ capability: requestedCapability, limit: 1 });
  const selectedTool = discovered[0];

  if (!selectedTool) {
    throw new Error(`Provider smoke discovery failed: no tool found for ${requestedCapability}`);
  }

  const identity = await client.resolveIdentity({ ensName: selectedTool.ensName });
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
    discover: {
      requestedCapability,
      candidateCount: discovered.length,
      selectedTool: {
        id: selectedTool.id,
        ensName: selectedTool.ensName,
        manifestUri: selectedTool.latestManifestUri,
        manifestHash: selectedTool.latestManifestHash,
        version: selectedTool.latestVersion,
        ownerAddress: selectedTool.ownerAddress
      }
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
    const traceId = randomUUID();
    const invocationStartedAt = new Date().toISOString();
    const inputHash = sdk.hashJson(input);
    const requestArtifactPayload = {
      traceId,
      type: "invocation-request",
      capability: requestedCapability,
      toolId: identity.id,
      manifestUri: identity.latestManifestUri,
      input
    };
    const requestArtifact = await client.saveArtifact({
      namespace: "artifacts",
      artifact: requestArtifactPayload
    });
    const response = await client.invokeTool<Record<string, unknown>, ScannerOutput>({
      capability: requestedCapability,
      tool: identity,
      manifest: resolvedManifest,
      agentId: "provider-live-smoke",
      input,
      traceId
    });
    const outputHash = response.output ? sdk.hashJson(response.output) : undefined;
    const outputArtifact =
      response.status === "ok" && response.output
        ? await client.saveArtifact({
            namespace: "artifacts",
            artifact: {
              traceId,
              type: "tool-output",
              toolId: identity.id,
              output: response.output
            }
          })
        : null;
    const responseArtifactPayload = {
      traceId,
      type: "invocation-response",
      toolId: identity.id,
      response
    };
    const responseArtifact = await client.saveArtifact({
      namespace: "artifacts",
      artifact: responseArtifactPayload
    });
    const logicalTraceUri = `0g://traces/${traceId}.json`;
    const report = await client.buildAuditReport({
      contractName: "Vault",
      traceId,
      traceUri: logicalTraceUri,
      toolId: identity.id,
      manifestUri: identity.latestManifestUri,
      manifestVersion: identity.latestVersion,
      summary:
        response.status === "ok"
          ? "Provider-backed capability discovery resolved the Solidity scanner, verified its 0G manifest, invoked it through AXL, and persisted provenance evidence."
          : "Provider-backed discovery and verification succeeded, but the AXL invocation returned an error.",
      findings: buildReportFindings(response.output, traceId, identity.id)
    });
    const reportArtifact = await client.saveArtifact({
      namespace: "reports",
      artifact: report
    });
    const trace = buildProviderTrace({
      traceId,
      requestedCapability,
      identity,
      manifest: resolvedManifest,
      candidateCount: discovered.length,
      verificationChecks: verification.checks,
      response,
      inputHash,
      outputHash,
      requestArtifact,
      responseArtifact,
      outputArtifact,
      reportArtifact,
      invocationStartedAt
    });
    const persistedTrace = await client.recordTrace({ trace });
    const dashboardMirrorTrace: ExecutionTrace = {
      ...trace,
      storage: {
        ...trace.storage,
        traceUri: persistedTrace.traceUri
      }
    };
    const dashboardMirrorReport: AuditReport = {
      ...report,
      traceUri: persistedTrace.traceUri
    };
    const dashboardMirrorPath = await writeDashboardMirror(rootDir, {
      trace: dashboardMirrorTrace,
      manifest: resolvedManifest,
      report: dashboardMirrorReport,
      artifacts: [
        { uri: requestArtifact.uri, value: requestArtifactPayload },
        { uri: responseArtifact.uri, value: responseArtifactPayload },
        ...(outputArtifact && response.output
          ? [
              {
                uri: outputArtifact.uri,
                value: {
                  traceId,
                  type: "tool-output",
                  toolId: identity.id,
                  output: response.output
                }
              }
            ]
          : []),
        { uri: reportArtifact.uri, value: dashboardMirrorReport },
        { uri: identity.latestManifestUri, value: resolvedManifest }
      ]
    });

    result.call = {
      status: response.status,
      requestUri: requestArtifact.uri,
      responseUri: responseArtifact.uri,
      outputUri: outputArtifact?.uri,
      inputHash,
      outputHash,
      output: response.output
    };
    result.trace = {
      traceId,
      traceUri: persistedTrace.traceUri,
      manifestUri: identity.latestManifestUri,
      manifestHash: identity.latestManifestHash,
      inputHash,
      outputHash,
      dashboardMirror: dashboardMirrorPath
    };
    result.report = {
      reportId: report.reportId,
      reportUri: reportArtifact.uri,
      findingCount: report.findings.length
    };
  } else {
    result.call = {
      skipped: true,
      reason: "Pass --call/--full or set OTM_PROVIDER_SMOKE_CALL=true to invoke the provider transport and persist trace/report evidence."
    };
  }

  console.log(JSON.stringify(result, null, 2));
}

function parseArgs(argv: string[]): SmokeArgs {
  return {
    envFile: readFlag(argv, "--env", DEFAULT_ENV_FILE),
    manifestPath: readFlag(argv, "--manifest", DEFAULT_MANIFEST),
    inputPath: readFlag(argv, "--input", DEFAULT_INPUT),
    call: argv.includes("--call") || argv.includes("--full"),
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

function getManifestCapability(manifest: Record<string, unknown>): string {
  const capabilities = Array.isArray(manifest.capabilities) ? manifest.capabilities : [];
  const firstCapability = capabilities.find(
    (capability): capability is { id: string } =>
      typeof capability === "object" &&
      capability !== null &&
      typeof (capability as { id?: unknown }).id === "string"
  );

  if (!firstCapability) {
    throw new Error("Provider smoke manifest must declare at least one capability");
  }

  return firstCapability.id;
}

function buildReportFindings(output: ScannerOutput | undefined, traceId: string, toolId: string): AuditReport["findings"] {
  return (output?.findings ?? []).map((finding, index) => ({
    id: finding.ruleId ?? `finding-${index + 1}`,
    severity: normalizeSeverity(finding.severity),
    title: finding.title ?? `Finding ${index + 1}`,
    description: finding.message ?? "The tool returned a finding without a message.",
    evidence: finding.message,
    traceId,
    toolId
  }));
}

function normalizeSeverity(value: unknown): "low" | "medium" | "high" | "critical" {
  return value === "critical" || value === "high" || value === "medium" || value === "low" ? value : "low";
}

function buildProviderTrace(input: {
  traceId: string;
  requestedCapability: string;
  candidateCount: number;
  identity: {
    id: string;
    ensName: string;
    latestManifestUri: string;
    latestManifestHash: string;
    latestVersion: string;
    ownerAddress: `0x${string}`;
  };
  manifest: {
    invocation: {
      axlPeerId: string;
      axlMethod: string;
    };
  };
  verificationChecks: ExecutionTrace["verification"] extends infer T
    ? Omit<T & Record<string, unknown>, "verifiedAt" | "rejectedReason">
    : never;
  response: {
    status: "ok" | "error";
    finishedAt: string;
    output?: ScannerOutput;
  };
  inputHash: string;
  outputHash: string | undefined;
  requestArtifact: { uri: string; hash: string };
  responseArtifact: { uri: string; hash: string };
  outputArtifact: { uri: string; hash: string } | null;
  reportArtifact: { uri: string; hash: string };
  invocationStartedAt: string;
}): ExecutionTrace {
  const now = new Date().toISOString();

  return {
    traceId: input.traceId,
    runId: input.traceId,
    agentId: "provider-live-smoke",
    requestedCapability: input.requestedCapability,
    tool: {
      toolId: input.identity.id,
      ensName: input.identity.ensName,
      manifestUri: input.identity.latestManifestUri,
      manifestHash: input.identity.latestManifestHash,
      version: input.identity.latestVersion,
      ownerAddress: input.identity.ownerAddress
    },
    discovery: {
      candidateCount: input.candidateCount,
      capabilityIndexUri: `0g://kv/capability:${input.requestedCapability}`,
      selectedReason: "selected from 0G KV capability discovery candidates before ENS resolution",
      resolvedAt: now,
      resolve: {
        ensName: input.identity.ensName,
        identityId: input.identity.id,
        manifestUri: input.identity.latestManifestUri,
        manifestHash: input.identity.latestManifestHash,
        version: input.identity.latestVersion,
        ownerAddress: input.identity.ownerAddress,
        evidence: `discover(${input.requestedCapability}) -> resolveIdentity(${input.identity.ensName}) -> loadManifest(${input.identity.latestManifestUri}) -> verifyManifest -> invokeTool`
      }
    },
    verification: {
      manifestHashValid: Boolean(input.verificationChecks.manifestHashValid),
      ownerValid: Boolean(input.verificationChecks.ownerValid),
      schemaValid: Boolean(input.verificationChecks.schemaValid),
      versionCompatible: Boolean(input.verificationChecks.versionCompatible),
      verifiedAt: now
    },
    invocation: {
      transport: "axl",
      peerId: input.manifest.invocation.axlPeerId,
      method: input.manifest.invocation.axlMethod,
      requestUri: input.requestArtifact.uri,
      responseUri: input.responseArtifact.uri,
      startedAt: input.invocationStartedAt,
      finishedAt: input.response.finishedAt,
      status: input.response.status === "ok" ? "ok" : "error"
    },
    io: {
      inputHash: input.inputHash,
      outputHash: input.outputHash
    },
    artifacts: [
      {
        kind: "invocation-request",
        uri: input.requestArtifact.uri,
        hash: input.requestArtifact.hash,
        mediaType: "application/json"
      },
      {
        kind: "invocation-response",
        uri: input.responseArtifact.uri,
        hash: input.responseArtifact.hash,
        mediaType: "application/json"
      },
      ...(input.outputArtifact
        ? [
            {
              kind: "tool-output" as const,
              uri: input.outputArtifact.uri,
              hash: input.outputArtifact.hash,
              mediaType: "application/json"
            }
          ]
        : []),
      {
        kind: "audit-report",
        uri: input.reportArtifact.uri,
        hash: input.reportArtifact.hash,
        mediaType: "application/json"
      }
    ],
    storage: {
      traceUri: `0g://traces/${input.traceId}.json`,
      persistedAt: now,
      backend: "0g-storage"
    }
  };
}

async function writeDashboardMirror(
  rootDir: string,
  input: {
    trace: ExecutionTrace;
    manifest: unknown;
    report: AuditReport;
    artifacts: Array<{ uri: string; value: unknown }>;
  }
): Promise<string> {
  const traceListPath = join(rootDir, ".opentoolmesh", "storage", "traces", `${input.trace.traceId}.json`);
  await writeJsonFile(traceListPath, input.trace);

  await writeStorageUriMirror(rootDir, input.trace.storage.traceUri, input.trace);
  for (const artifact of input.artifacts) {
    await writeStorageUriMirror(rootDir, artifact.uri, artifact.value);
  }

  return traceListPath;
}

async function writeStorageUriMirror(rootDir: string, uri: string, value: unknown): Promise<void> {
  if (!uri.startsWith("0g://")) {
    return;
  }

  await writeJsonFile(join(rootDir, ".opentoolmesh", "storage", ...uri.slice("0g://".length).split("/")), value);
}

async function writeJsonFile(path: string, value: unknown): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function deriveAddressFromPrivateKey(privateKey: string): Promise<string> {
  const { Wallet } = (await import(sdkRequire.resolve("ethers"))) as { Wallet: new (privateKey: string) => { address: string } };
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
