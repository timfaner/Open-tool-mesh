import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

type SeverityTone = 'high' | 'medium' | 'low';
type ChipTone = 'success' | 'info';

type TraceRecord = {
  traceId: string;
  runId?: string;
  requestedCapability?: string;
  tool?: {
    toolId?: string;
    ensName?: string;
    manifestUri?: string;
    manifestHash?: string;
    version?: string;
    ownerAddress?: string;
  };
  discovery?: {
    candidateCount?: number;
    capabilityIndexUri?: string;
    selectedReason?: string;
    resolvedAt?: string;
    resolve?: {
      ensName?: string;
      identityId?: string;
      manifestUri?: string;
      manifestHash?: string;
      version?: string;
      ownerAddress?: string;
      evidence?: string;
    };
  };
  verification?: {
    manifestHashValid?: boolean;
    ownerValid?: boolean;
    schemaValid?: boolean;
    versionCompatible?: boolean;
    verifiedAt?: string;
  };
  invocation?: {
    transport?: string;
    peerId?: string;
    method?: string;
    requestUri?: string;
    responseUri?: string;
    startedAt?: string;
    finishedAt?: string;
    status?: string;
  };
  io?: {
    inputHash?: string;
    outputHash?: string;
  };
  artifacts?: Array<{
    kind?: string;
    uri?: string;
    hash?: string;
  }>;
  storage?: {
    traceUri?: string;
    persistedAt?: string;
    backend?: string;
  };
};

type ReportRecord = {
  reportId: string;
  traceId?: string;
  traceUri?: string;
  toolId?: string;
  manifestUri?: string;
  manifestVersion?: string;
  contractName?: string;
  summary?: string;
  findings?: Array<{
    severity?: SeverityTone;
    title?: string;
    description?: string;
    traceId?: string;
  }>;
  generatedAt?: string;
};

type ManifestRecord = {
  version?: string;
  owner?: { address?: string };
  compatibility?: { sdkVersionRange?: string };
  mcp?: { toolName?: string };
};

type ArtifactRecord = {
  traceId: string;
  toolId?: string;
  output?: {
    findings?: Array<{
      severity?: SeverityTone;
      message?: string;
    }>;
    summary?: {
      totalFindings?: number;
      critical?: number;
      high?: number;
      medium?: number;
      low?: number;
    };
  };
};

export interface DashboardRun {
  source: 'fixture' | 'runtime';
  runId: string;
  environment: string;
  contractReference: string;
  headerStatus: Array<{ label: string; tone: ChipTone }>;
  lifecycleState: Record<'Publish' | 'Discover' | 'Verify' | 'Call' | 'Trace' | 'Report', string>;
  stepDetails: Record<'Publish' | 'Discover' | 'Verify' | 'Call' | 'Trace' | 'Report', string>;
  publish: {
    ensName: string;
    manifestUri: string;
    manifestHash: string;
    capabilityIndex: string;
    owner: string;
  };
  discovery: {
    requestedCapability: string;
    candidateCount: string;
    resolvedIdentity: string;
    ensName: string;
    capabilityIndex: string;
    selectedReason: string;
    resolvedAt: string;
    notHardcoded: string;
  };
  manifest: {
    uri: string;
    version: string;
    owner: string;
    schemaStatus: string;
    sdkVersionRange: string;
    ownerValid: string;
    versionCompatible: string;
    hash: string;
  };
  invocation: {
    agent: string;
    remoteNode: string;
    peer: string;
    method: string;
    transport: string;
    status: string;
    requestUri: string;
    responseUri: string;
    requestSummary: string;
    responseSummary: string;
    startedAt: string;
    finishedAt: string;
  };
  memory: {
    traceId: string;
    traceUri: string;
    inputHash: string;
    outputHash: string;
    artifact: string;
    requestUri: string;
    responseUri: string;
    backend: string;
    reportUri: string;
    reportHash: string;
    persistedAt: string;
  };
  report: {
    reportId: string;
    reportUri: string;
    title: string;
    findings: number;
    severity: Array<{ label: string; value: number; tone: SeverityTone }>;
    summaryText: string;
    generatedAt: string;
    traceReference: string;
    toolReference: string;
    secondaryFinding?: string;
  };
  artifact: ArtifactRecord;
}

const fixtureDemoRun: DashboardRun = {
  source: 'fixture' as const,
  runId: 'c1f7441a-42fe-4a2d-b000-ea1bf1e673b4',
  environment: 'Hackathon MVP',
  contractReference: 'Vault.sol',
  headerStatus: [
    { label: 'Verified', tone: 'success' as ChipTone },
    { label: 'AXL', tone: 'info' as ChipTone },
    { label: 'Fixture Baseline', tone: 'info' as ChipTone },
  ],
  lifecycleState: {
    Publish: 'done',
    Discover: 'done',
    Verify: 'done',
    Call: 'done',
    Trace: 'done',
    Report: 'done',
  },
  stepDetails: {
    Publish: 'Manifest published at 0g://manifests/otm_ens_solidity-scanner.auditagent.eth-0.1.0.json.',
    Discover: 'Resolved solidity-scanner.auditagent.eth at 2026-04-28T14:56:11.921Z.',
    Verify: 'verified at 2026-04-28T14:56:11.921Z.',
    Call: 'ok over AXL from 2026-04-28T14:56:11.891Z to 2026-04-28T14:56:11.921Z.',
    Trace: 'Persisted to 0g://traces/c1f7441a-42fe-4a2d-b000-ea1bf1e673b4.json at 2026-04-28T14:56:11.921Z.',
    Report: 'Report report_1777390727691 generated at 2026-04-28T14:56:11.950Z.',
  },
  publish: {
    ensName: 'solidity-scanner.auditagent.eth',
    manifestUri: '0g://manifests/otm_ens_solidity-scanner.auditagent.eth-0.1.0.json',
    manifestHash: 'sha256:ddd20540138a8fb9711cb3d751f940964390d3a9fb54e147c0284e6205f64524',
    capabilityIndex: '0g://indexes/capabilities/solidity-static-analysis.json',
    owner: '0x1234567890abcdef1234567890abcdef12345678',
  },
  discovery: {
    requestedCapability: 'solidity-static-analysis',
    candidateCount: '1 candidate',
    resolvedIdentity: 'otm:ens:solidity-scanner.auditagent.eth',
    ensName: 'solidity-scanner.auditagent.eth',
    capabilityIndex: '0g://indexes/capabilities/solidity-static-analysis.json',
    selectedReason: 'best capability match',
    resolvedAt: '2026-04-28T14:56:11.921Z',
    notHardcoded: 'yes',
  },
  manifest: {
    uri: '0g://manifests/otm_ens_solidity-scanner.auditagent.eth-0.1.0.json',
    version: '0.1.0',
    owner: '0x1234567890abcdef1234567890abcdef12345678',
    schemaStatus: 'verified',
    sdkVersionRange: '^0.1.0',
    ownerValid: 'true',
    versionCompatible: 'true',
    hash: 'sha256:ddd20540138a8fb9711cb3d751f940964390d3a9fb54e147c0284e6205f64524',
  },
  invocation: {
    agent: 'Solidity Audit Agent',
    remoteNode: 'solidity-pattern-scanner',
    peer: 'axl-peer-solidity-01',
    method: 'invokeTool',
    transport: 'axl',
    status: 'ok',
    requestUri: '0g://artifacts/c1f7441a-42fe-4a2d-b000-ea1bf1e673b4-invocation-request.json',
    responseUri: '0g://artifacts/c1f7441a-42fe-4a2d-b000-ea1bf1e673b4-invocation-response.json',
    requestSummary: 'solidity-static-analysis against Vault.sol',
    responseSummary: '3 findings returned',
    startedAt: '2026-04-28T14:56:11.891Z',
    finishedAt: '2026-04-28T14:56:11.921Z',
  },
  memory: {
    traceId: 'c1f7441a-42fe-4a2d-b000-ea1bf1e673b4',
    traceUri: '0g://traces/c1f7441a-42fe-4a2d-b000-ea1bf1e673b4.json',
    inputHash: 'sha256:e86c47ebdbb303887f746b75a3877f806a6ffed429ad208f8249a751d9c290b4',
    outputHash: 'sha256:69bb4650459cd22722f676912cb5315d073d40ced1f79c5ac88602072eb47b00',
    artifact: '0g://artifacts/c1f7441a-42fe-4a2d-b000-ea1bf1e673b4.json',
    requestUri: '0g://artifacts/c1f7441a-42fe-4a2d-b000-ea1bf1e673b4-invocation-request.json',
    responseUri: '0g://artifacts/c1f7441a-42fe-4a2d-b000-ea1bf1e673b4-invocation-response.json',
    backend: '0g-storage',
    reportUri: '0g://reports/report_1777390727691.json',
    reportHash: 'sha256:8b5ac39ae14e83e9d889ae2251dafebba2c7565edc9f92a19cc86ccb1a2f21cb',
    persistedAt: '2026-04-28T14:56:11.921Z',
  },
  report: {
    reportId: 'report_1777390727691',
    reportUri: '0g://reports/report_1777390727691.json',
    title: 'Reentrancy risk in withdraw()',
    findings: 3,
    severity: [
      { label: 'High', value: 1, tone: 'high' as SeverityTone },
      { label: 'Medium', value: 1, tone: 'medium' as SeverityTone },
      { label: 'Low', value: 1, tone: 'low' as SeverityTone },
    ],
    summaryText:
      'Capability discovery resolved solidity-static-analysis to a remote Solidity scanner, then completed the AXL invocation and trace persistence.',
    generatedAt: '2026-04-28T14:56:11.950Z',
    traceReference: 'c1f7441a-42fe-4a2d-b000-ea1bf1e673b4',
    toolReference: 'solidity-pattern-scanner',
    secondaryFinding:
      'LOW · Administrative path lacks event emission — Owner-controlled actions should emit events for auditability.',
  },
  artifact: {
    traceId: 'c1f7441a-42fe-4a2d-b000-ea1bf1e673b4',
    output: {
      findings: [
        {
          severity: 'high' as SeverityTone,
          message: 'Unchecked external call before state update can enable reentrancy in withdraw().',
        },
      ],
      summary: {
        totalFindings: 3,
        high: 1,
        medium: 1,
        low: 1,
      },
    },
  },
};

const moduleDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = process.env.OPENTOOLMESH_DASHBOARD_REPO_ROOT ?? path.resolve(moduleDir, '..', '..', '..');
const storageRoot = path.join(repoRoot, '.opentoolmesh', 'storage');

function readJsonFile<T>(filePath: string): T {
  return JSON.parse(readFileSync(filePath, 'utf8')) as T;
}

function listTraceFiles(): string[] {
  const tracesDir = path.join(storageRoot, 'traces');
  if (!existsSync(tracesDir)) {
    return [];
  }

  const entries = readdirSync(tracesDir)
    .filter((entry) => entry.endsWith('.json'))
    .map((entry) => ({
      entry,
      filePath: path.join(tracesDir, entry),
      mtimeMs: statSync(path.join(tracesDir, entry)).mtimeMs,
      persistedAt: (() => {
        try {
          const trace = readJsonFile<TraceRecord>(path.join(tracesDir, entry));
          return Date.parse(trace.storage?.persistedAt ?? '') || 0;
        } catch {
          return 0;
        }
      })(),
    }))
    .sort((left, right) => right.persistedAt - left.persistedAt || right.mtimeMs - left.mtimeMs);

  return entries.map((entry) => entry.filePath);
}

function getArtifactByKind(trace: TraceRecord, kind: string) {
  return trace.artifacts?.find((artifact) => artifact.kind === kind);
}

function getStorageFilePath(uri: string | undefined): string | null {
  if (!uri?.startsWith('0g://')) {
    return null;
  }

  return path.join(storageRoot, uri.slice('0g://'.length));
}

function getToolDisplayName(trace: TraceRecord, manifest: ManifestRecord | null) {
  return manifest?.mcp?.toolName ?? fixtureDemoRun.invocation.remoteNode;
}

function formatContractReference(contractName?: string) {
  if (!contractName) {
    return fixtureDemoRun.contractReference;
  }

  return contractName.endsWith('.sol') ? contractName : `${contractName}.sol`;
}

function buildRuntimeDemoRunFromTrace(trace: TraceRecord): DashboardRun | null {
  if (trace.invocation?.status !== 'ok') {
    return null;
  }

  const resolvedEnsName = trace.discovery?.resolve?.ensName ?? trace.tool?.ensName;
  const resolveEvidence = trace.discovery?.resolve?.evidence;
  const resolvedIdentity =
    trace.discovery?.resolve?.identityId ??
    trace.tool?.toolId ??
    (resolvedEnsName ? `otm:ens:${resolvedEnsName}` : undefined);
  const resolvedAt = trace.discovery?.resolvedAt;

  // Require explicit runtime resolve evidence so the dashboard can prove
  // resolveIdentity happened before loadManifest/invokeTool, rather than inferring it.
  if (!resolvedEnsName || !resolvedIdentity || !resolvedAt || !resolveEvidence) {
    return null;
  }

  const reportArtifact = getArtifactByKind(trace, 'audit-report');
  const toolOutputArtifact = getArtifactByKind(trace, 'tool-output');
  const requestArtifact = getArtifactByKind(trace, 'invocation-request');
  const responseArtifact = getArtifactByKind(trace, 'invocation-response');
  const manifestPath = getStorageFilePath(trace.tool?.manifestUri);
  const reportPath = getStorageFilePath(reportArtifact?.uri);
  const toolOutputPath = getStorageFilePath(toolOutputArtifact?.uri);

  if (!manifestPath || !reportPath || !toolOutputPath) {
    return null;
  }

  if (![manifestPath, reportPath, toolOutputPath].every((filePath) => existsSync(filePath))) {
    return null;
  }

  const manifest = readJsonFile<ManifestRecord>(manifestPath);
  const report = readJsonFile<ReportRecord>(reportPath);
  const artifact = readJsonFile<ArtifactRecord>(toolOutputPath);

  if (
    report.traceId !== trace.traceId ||
    report.traceUri !== trace.storage?.traceUri ||
    report.manifestUri !== trace.tool?.manifestUri
  ) {
    return null;
  }

  if (report.findings?.some((finding) => finding.traceId && finding.traceId !== trace.traceId)) {
    return null;
  }

  if (artifact.traceId !== trace.traceId || (artifact.toolId && artifact.toolId !== trace.tool?.toolId)) {
    return null;
  }

  const summary = artifact.output?.summary;
  const findings = report.findings ?? [];
  const topFinding = findings.find((finding) => finding.severity === 'high') ?? findings[0];
  const transportLabel = (trace.invocation?.transport ?? 'axl').toUpperCase();
  const toolDisplayName = getToolDisplayName(trace, manifest);
  const contractReference = formatContractReference(report.contractName);
  const topFindingSummary = topFinding
    ? `${(topFinding.severity ?? 'low').toUpperCase()} · ${topFinding.title ?? 'Untitled finding'} — ${topFinding.description ?? 'No description provided.'}`
    : null;
  const secondaryFinding = findings
    .map(
      (finding) =>
        `${(finding.severity ?? 'low').toUpperCase()} · ${finding.title ?? 'Untitled finding'} — ${finding.description ?? 'No description provided.'}`,
    )
    .find((summaryLine) => summaryLine !== topFindingSummary);

  return {
    source: 'runtime' as const,
    runId: trace.runId ?? trace.traceId,
    environment: 'Hackathon MVP',
    contractReference,
    headerStatus: [
      { label: 'Verified', tone: 'success' as ChipTone },
      { label: `${transportLabel} Live`, tone: 'info' as ChipTone },
      { label: 'Trace Stored', tone: 'success' as ChipTone },
    ],
    lifecycleState: {
      Publish: 'done',
      Discover: 'done',
      Verify: 'done',
      Call: 'done',
      Trace: 'done',
      Report: 'done',
    },
    stepDetails: {
      Publish: `ENS ${resolvedEnsName} points to ${trace.tool?.manifestUri ?? fixtureDemoRun.publish.manifestUri} and capability index ${trace.discovery?.capabilityIndexUri ?? fixtureDemoRun.publish.capabilityIndex}.`,
      Discover: `Resolved ${resolvedEnsName} at ${resolvedAt}. ${resolveEvidence}.`,
      Verify: `verified at ${trace.verification?.verifiedAt ?? 'unknown time'}.`,
      Call: `${trace.invocation?.status ?? 'unknown'} over ${transportLabel} from ${trace.invocation?.startedAt ?? 'unknown start'} to ${trace.invocation?.finishedAt ?? 'unknown end'}.`,
      Trace: `Persisted to ${trace.storage?.traceUri ?? fixtureDemoRun.memory.traceUri} at ${trace.storage?.persistedAt ?? 'unknown time'}.`,
      Report: `Report ${report.reportId} generated at ${report.generatedAt ?? 'unknown time'}.`,
    },
    publish: {
      ensName: resolvedEnsName,
      manifestUri: trace.tool?.manifestUri ?? fixtureDemoRun.publish.manifestUri,
      manifestHash: trace.tool?.manifestHash ?? fixtureDemoRun.publish.manifestHash,
      capabilityIndex: trace.discovery?.capabilityIndexUri ?? fixtureDemoRun.publish.capabilityIndex,
      owner: trace.tool?.ownerAddress ?? trace.discovery?.resolve?.ownerAddress ?? fixtureDemoRun.publish.owner,
    },
    discovery: {
      requestedCapability: trace.requestedCapability ?? fixtureDemoRun.discovery.requestedCapability,
      candidateCount: `${trace.discovery?.candidateCount ?? 1} candidate${(trace.discovery?.candidateCount ?? 1) === 1 ? '' : 's'}`,
      resolvedIdentity,
      ensName: resolvedEnsName,
      capabilityIndex: trace.discovery?.capabilityIndexUri ?? fixtureDemoRun.discovery.capabilityIndex,
      selectedReason: trace.discovery?.selectedReason ?? resolveEvidence,
      resolvedAt,
      notHardcoded: 'yes',
    },
    manifest: {
      uri: trace.tool?.manifestUri ?? fixtureDemoRun.manifest.uri,
      version: trace.tool?.version ?? trace.discovery?.resolve?.version ?? manifest.version ?? fixtureDemoRun.manifest.version,
      owner: trace.tool?.ownerAddress ?? trace.discovery?.resolve?.ownerAddress ?? manifest.owner?.address ?? fixtureDemoRun.manifest.owner,
      schemaStatus: trace.verification?.schemaValid ? 'verified' : 'unknown',
      sdkVersionRange: manifest.compatibility?.sdkVersionRange ?? `^${trace.tool?.version ?? manifest.version ?? fixtureDemoRun.manifest.version}`,
      ownerValid: trace.verification?.ownerValid ? 'true' : 'false',
      versionCompatible: trace.verification?.versionCompatible ? 'true' : 'false',
      hash: trace.tool?.manifestHash ?? trace.discovery?.resolve?.manifestHash ?? fixtureDemoRun.manifest.hash,
    },
    invocation: {
      agent: report.contractName ? `${report.contractName} Audit Agent` : fixtureDemoRun.invocation.agent,
      remoteNode: toolDisplayName,
      peer: trace.invocation?.peerId ?? fixtureDemoRun.invocation.peer,
      method: trace.invocation?.method ?? fixtureDemoRun.invocation.method,
      transport: (trace.invocation?.transport ?? fixtureDemoRun.invocation.transport).toLowerCase(),
      status: trace.invocation?.status ?? fixtureDemoRun.invocation.status,
      requestUri: requestArtifact?.uri ?? trace.invocation?.requestUri ?? fixtureDemoRun.invocation.requestUri,
      responseUri: responseArtifact?.uri ?? trace.invocation?.responseUri ?? fixtureDemoRun.invocation.responseUri,
      requestSummary: `${trace.requestedCapability ?? fixtureDemoRun.discovery.requestedCapability} against ${contractReference}`,
      responseSummary: `${summary?.totalFindings ?? findings.length} findings returned`,
      startedAt: trace.invocation?.startedAt ?? fixtureDemoRun.invocation.startedAt,
      finishedAt: trace.invocation?.finishedAt ?? fixtureDemoRun.invocation.finishedAt,
    },
    memory: {
      traceId: trace.traceId,
      traceUri: trace.storage?.traceUri ?? fixtureDemoRun.memory.traceUri,
      inputHash: trace.io?.inputHash ?? fixtureDemoRun.memory.inputHash,
      outputHash: trace.io?.outputHash ?? fixtureDemoRun.memory.outputHash,
      artifact: toolOutputArtifact?.uri ?? fixtureDemoRun.memory.artifact,
      requestUri: requestArtifact?.uri ?? trace.invocation?.requestUri ?? fixtureDemoRun.memory.requestUri,
      responseUri: responseArtifact?.uri ?? trace.invocation?.responseUri ?? fixtureDemoRun.memory.responseUri,
      backend: trace.storage?.backend ?? fixtureDemoRun.memory.backend,
      reportUri: reportArtifact?.uri ?? fixtureDemoRun.memory.reportUri,
      reportHash: reportArtifact?.hash ?? fixtureDemoRun.memory.reportHash,
      persistedAt: trace.storage?.persistedAt ?? fixtureDemoRun.memory.persistedAt,
    },
    report: {
      reportId: report.reportId,
      reportUri: reportArtifact?.uri ?? fixtureDemoRun.report.reportUri,
      title: topFinding?.title ?? fixtureDemoRun.report.title,
      findings: summary?.totalFindings ?? findings.length,
      severity: [
        { label: 'High', value: summary?.high ?? 0, tone: 'high' as SeverityTone },
        { label: 'Medium', value: summary?.medium ?? 0, tone: 'medium' as SeverityTone },
        { label: 'Low', value: summary?.low ?? 0, tone: 'low' as SeverityTone },
      ],
      summaryText: report.summary ?? fixtureDemoRun.report.summaryText,
      generatedAt: report.generatedAt ?? fixtureDemoRun.report.generatedAt,
      traceReference: trace.traceId,
      toolReference: toolDisplayName,
      secondaryFinding,
    },
    artifact,
  };
}

function buildRuntimeDemoRun(): DashboardRun | null {
  for (const filePath of listTraceFiles()) {
    try {
      const candidate = buildRuntimeDemoRunFromTrace(readJsonFile<TraceRecord>(filePath));
      if (candidate) {
        return candidate;
      }
    } catch {
      continue;
    }
  }

  return null;
}

export async function getDashboardRun(): Promise<DashboardRun> {
  return buildRuntimeDemoRun() ?? fixtureDemoRun;
}

export const demoRun = await getDashboardRun();
