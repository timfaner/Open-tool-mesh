import { access, readdir, readFile, stat } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

interface Check {
  name: string;
  ok: boolean;
  detail: string;
}

interface AuditArgs {
  trace?: string;
}

const PROVIDER_AGENT_ID = "provider-live-smoke";
const PROVIDER_URI_PREFIX = "0g://root/";

async function main() {
  const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const args = parseArgs(process.argv.slice(2));
  const tracePath = args.trace
    ? resolveTracePath(rootDir, args.trace)
    : await findLatestTracePath(rootDir);

  const trace = await readJson(tracePath);
  const checks: Check[] = [];

  check(checks, "provider smoke trace", trace.agentId === PROVIDER_AGENT_ID, `agentId=${stringValue(trace.agentId)}`);
  check(checks, "requested capability", trace.requestedCapability === "solidity-static-analysis", `requestedCapability=${stringValue(trace.requestedCapability)}`);
  check(checks, "ENS identity", isEnsToolId(trace.tool?.toolId) && looksLikeEnsName(trace.tool?.ensName), `toolId=${stringValue(trace.tool?.toolId)}, ensName=${stringValue(trace.tool?.ensName)}`);
  check(checks, "provider manifest URI", isProviderUri(trace.tool?.manifestUri), `manifestUri=${stringValue(trace.tool?.manifestUri)}`);
  check(checks, "provider trace URI", isProviderUri(trace.storage?.traceUri), `traceUri=${stringValue(trace.storage?.traceUri)}`);
  check(checks, "0G storage backend", trace.storage?.backend === "0g-storage", `backend=${stringValue(trace.storage?.backend)}`);
  check(checks, "discovery candidate", Number(trace.discovery?.candidateCount) >= 1, `candidateCount=${stringValue(trace.discovery?.candidateCount)}`);
  check(checks, "discovery resolution", trace.discovery?.resolve?.manifestUri === trace.tool?.manifestUri, `resolvedManifestUri=${stringValue(trace.discovery?.resolve?.manifestUri)}`);
  check(
    checks,
    "manifest verification",
    trace.verification?.manifestHashValid === true &&
      trace.verification?.ownerValid === true &&
      trace.verification?.schemaValid === true &&
      trace.verification?.versionCompatible === true,
    `manifestHash=${stringValue(trace.verification?.manifestHashValid)}, owner=${stringValue(trace.verification?.ownerValid)}, schema=${stringValue(trace.verification?.schemaValid)}, version=${stringValue(trace.verification?.versionCompatible)}`
  );
  check(checks, "AXL invocation", trace.invocation?.transport === "axl" && trace.invocation?.status === "ok", `transport=${stringValue(trace.invocation?.transport)}, status=${stringValue(trace.invocation?.status)}`);
  check(checks, "invocation method", typeof trace.invocation?.method === "string" && trace.invocation.method.length > 0, `method=${stringValue(trace.invocation?.method)}`);
  check(checks, "input/output hashes", isSha256(trace.io?.inputHash) && isSha256(trace.io?.outputHash), `inputHash=${stringValue(trace.io?.inputHash)}, outputHash=${stringValue(trace.io?.outputHash)}`);

  const artifacts = Array.isArray(trace.artifacts) ? trace.artifacts : [];
  const requiredKinds = ["invocation-request", "invocation-response", "tool-output", "audit-report"];
  for (const kind of requiredKinds) {
    const artifact = artifacts.find((candidate: Record<string, unknown>) => candidate?.kind === kind);
    check(checks, `artifact ${kind}`, Boolean(artifact), artifact ? `uri=${stringValue(artifact.uri)}` : "missing");
    if (artifact) {
      check(checks, `artifact ${kind} provider URI`, isProviderUri(artifact.uri), `uri=${stringValue(artifact.uri)}`);
      check(checks, `artifact ${kind} hash`, isArtifactHash(artifact.hash), `hash=${stringValue(artifact.hash)}`);
      check(checks, `artifact ${kind} mirror`, await fileExists(storageMirrorPath(rootDir, artifact.uri)), storageMirrorPath(rootDir, artifact.uri));
    }
  }

  const manifestPath = storageMirrorPath(rootDir, trace.tool?.manifestUri);
  const reportArtifact = artifacts.find((artifact: Record<string, unknown>) => artifact?.kind === "audit-report");
  const reportPath = storageMirrorPath(rootDir, reportArtifact?.uri);
  const traceMirrorPath = storageMirrorPath(rootDir, trace.storage?.traceUri);

  check(checks, "manifest mirror", await fileExists(manifestPath), manifestPath);
  check(checks, "report mirror", await fileExists(reportPath), reportPath);
  check(checks, "trace mirror", await fileExists(traceMirrorPath), traceMirrorPath);

  if (await fileExists(manifestPath)) {
    const manifest = await readJson(manifestPath);
    check(checks, "manifest identity", manifest.toolId === trace.tool?.toolId && manifest.owner?.ensName === trace.tool?.ensName, `toolId=${stringValue(manifest.toolId)}, owner.ensName=${stringValue(manifest.owner?.ensName)}`);
    check(checks, "manifest owner", lower(manifest.owner?.address) === lower(trace.tool?.ownerAddress), `owner=${stringValue(manifest.owner?.address)}`);
    check(checks, "manifest capability", manifestHasCapability(manifest, trace.requestedCapability), `capability=${stringValue(trace.requestedCapability)}`);
    check(checks, "manifest AXL peer", manifest.invocation?.axlPeerId === trace.invocation?.peerId, `axlPeerId=${stringValue(manifest.invocation?.axlPeerId)}`);
    check(checks, "manifest AXL method", manifest.invocation?.axlMethod === trace.invocation?.method, `axlMethod=${stringValue(manifest.invocation?.axlMethod)}`);
  }

  if (await fileExists(reportPath)) {
    const report = await readJson(reportPath);
    check(checks, "report trace", report.traceId === trace.traceId && report.traceUri === trace.storage?.traceUri, `traceId=${stringValue(report.traceId)}, traceUri=${stringValue(report.traceUri)}`);
    check(checks, "report tool", report.toolId === trace.tool?.toolId && report.manifestUri === trace.tool?.manifestUri, `toolId=${stringValue(report.toolId)}, manifestUri=${stringValue(report.manifestUri)}`);
    check(checks, "report findings", Array.isArray(report.findings), `findingCount=${Array.isArray(report.findings) ? report.findings.length : "missing"}`);
  }

  if (await fileExists(traceMirrorPath)) {
    const mirroredTrace = await readJson(traceMirrorPath);
    check(checks, "trace mirror identity", mirroredTrace.traceId === trace.traceId, `mirroredTraceId=${stringValue(mirroredTrace.traceId)}`);
  }

  const ok = checks.every((item) => item.ok);
  console.log(
    JSON.stringify(
      {
        ok,
        tracePath,
        traceId: trace.traceId,
        checks
      },
      null,
      2
    )
  );

  if (!ok) {
    process.exitCode = 1;
  }
}

function parseArgs(argv: string[]): AuditArgs {
  return {
    trace: readOptionalFlag(argv, "--trace")
  };
}

function readOptionalFlag(argv: string[], name: string): string | undefined {
  const index = argv.indexOf(name);
  if (index === -1) {
    return undefined;
  }
  const value = argv[index + 1]?.trim();
  if (!value || value.startsWith("--")) {
    throw new Error(`Missing value for ${name}`);
  }
  return value;
}

async function findLatestTracePath(rootDir: string): Promise<string> {
  const tracesDir = join(rootDir, ".opentoolmesh", "storage", "traces");
  const entries = await readdir(tracesDir);
  const candidates = await Promise.all(
    entries
      .filter((entry) => entry.endsWith(".json"))
      .map(async (entry) => {
        const path = join(tracesDir, entry);
        const info = await stat(path);
        return { path, mtimeMs: info.mtimeMs };
      })
  );

  candidates.sort((left, right) => right.mtimeMs - left.mtimeMs);
  const latest = candidates[0];
  if (!latest) {
    throw new Error(`No trace mirror found under ${tracesDir}. Run provider:smoke -- --full first.`);
  }
  return latest.path;
}

function resolveTracePath(rootDir: string, trace: string): string {
  if (trace.endsWith(".json") || trace.includes("/")) {
    return resolve(rootDir, trace);
  }
  return join(rootDir, ".opentoolmesh", "storage", "traces", `${trace}.json`);
}

async function readJson(path: string): Promise<Record<string, any>> {
  return JSON.parse(await readFile(path, "utf8")) as Record<string, any>;
}

async function fileExists(path: string): Promise<boolean> {
  if (!path) {
    return false;
  }
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

function storageMirrorPath(rootDir: string, uri: unknown): string {
  if (typeof uri !== "string" || !uri.startsWith("0g://")) {
    return "";
  }
  return join(rootDir, ".opentoolmesh", "storage", ...uri.slice("0g://".length).split("/"));
}

function check(checks: Check[], name: string, ok: boolean, detail: string): void {
  checks.push({ name, ok, detail });
}

function isProviderUri(value: unknown): value is string {
  return typeof value === "string" && value.startsWith(PROVIDER_URI_PREFIX) && value.length > PROVIDER_URI_PREFIX.length;
}

function isSha256(value: unknown): value is string {
  return typeof value === "string" && /^sha256:[a-f0-9]{64}$/i.test(value);
}

function isArtifactHash(value: unknown): value is string {
  return isSha256(value) || (typeof value === "string" && /^0x[a-f0-9]{64}$/i.test(value));
}

function isEnsToolId(value: unknown): boolean {
  return typeof value === "string" && value.startsWith("otm:ens:") && looksLikeEnsName(value.slice("otm:ens:".length));
}

function looksLikeEnsName(value: unknown): boolean {
  return typeof value === "string" && /^[a-zA-Z0-9-]+(\.[a-zA-Z0-9-]+)+$/.test(value);
}

function manifestHasCapability(manifest: Record<string, any>, capability: unknown): boolean {
  return (
    typeof capability === "string" &&
    Array.isArray(manifest.capabilities) &&
    manifest.capabilities.some((item: Record<string, unknown>) => item?.id === capability)
  );
}

function lower(value: unknown): string {
  return typeof value === "string" ? value.toLowerCase() : "";
}

function stringValue(value: unknown): string {
  if (value === undefined) {
    return "undefined";
  }
  if (value === null) {
    return "null";
  }
  if (typeof value === "string") {
    return value;
  }
  return JSON.stringify(value);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
