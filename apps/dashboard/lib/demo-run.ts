import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
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

type ArtifactRecord = {
  traceId: string;
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

const fixtureDemoRun = {
  runId: 'c1f7441a-42fe-4a2d-b000-ea1bf1e673b4',
  environment: 'Demo Environment · ENS + 0G + AXL',
  headerStatus: [
    { label: 'Verified', tone: 'success' as ChipTone },
    { label: 'AXL', tone: 'info' as ChipTone },
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
    Publish: 'Manifest published at 0g://manifests/otm_ens_solidity-scanner.auditagent.eth-0.1.0.json.',
    Discover: 'Resolved solidity-scanner.auditagent.eth at 2026-04-28T14:56:11.921Z.',
    Verify: 'verified at 2026-04-28T14:56:11.921Z.',
    Call: 'ok over AXL from 2026-04-28T14:56:11.891Z to 2026-04-28T14:56:11.921Z.',
    Trace: 'Persisted to 0g://traces/c1f7441a-42fe-4a2d-b000-ea1bf1e673b4.json at 2026-04-28T14:56:11.921Z.',
    Report: 'Report report_1777390727691 generated at 2026-04-28T14:56:11.950Z.',
  },
  discovery: {
    requestedCapability: 'solidity-static-analysis',
    resolvedIdentity: 'otm:ens:solidity-scanner.auditagent.eth',
    ensName: 'solidity-scanner.auditagent.eth',
    tool: 'solidity-pattern-scanner',
    capabilityIndex: '0g://indexes/capabilities/solidity-static-analysis.json',
    capabilityMatches: '1 candidate tool selected',
    selectedReason: 'selected from capability discovery candidates for solidity-static-analysis',
    resolvedAt: '2026-04-28T14:56:11.921Z',
    invocationMode: 'Fixture fallback',
  },
  manifest: {
    uri: '0g://manifests/otm_ens_solidity-scanner.auditagent.eth-0.1.0.json',
    version: '0.1.0',
    owner: '0x1234567890abcdef1234567890abcdef12345678',
    verificationOutcome: 'verified',
    hashStatus: 'verified',
    ownerStatus: 'verified',
    schemaStatus: 'verified',
    versionStatus: 'compatible',
    compatibility: '^0.1.0',
    hash: 'sha256:ddd20540138a8fb9711cb3d751f940964390d3a9fb54e147c0284e6205f64524',
    verifiedAt: '2026-04-28T14:56:11.921Z',
  },
  invocation: {
    agent: 'Solidity Audit Agent',
    remoteNode: 'solidity-pattern-scanner',
    peer: 'axl-peer-solidity-01',
    method: 'invokeTool',
    transport: 'AXL',
    status: 'ok',
    requestSummary: 'solidity-static-analysis · sha256:e86c47ebdbb303887f746b75a3877f806a6ffed429ad208f8249a751d9c290b4',
    responseSummary: '3 findings · high 1 · medium 1 · low 1',
    findingsBadge: 'Structured response · findings: 3',
    startedAt: '2026-04-28T14:56:11.891Z',
    finishedAt: '2026-04-28T14:56:11.921Z',
  },
  memory: {
    traceUri: '0g://traces/c1f7441a-42fe-4a2d-b000-ea1bf1e673b4.json',
    inputHash: 'sha256:e86c47ebdbb303887f746b75a3877f806a6ffed429ad208f8249a751d9c290b4',
    outputHash: 'sha256:69bb4650459cd22722f676912cb5315d073d40ced1f79c5ac88602072eb47b00',
    artifactReference: '0g://artifacts/c1f7441a-42fe-4a2d-b000-ea1bf1e673b4.json',
    artifactHash: 'sha256:13861cfa1ff46ccaaf17d4a36ccf7a63f174f9784ed3f1a6a213a479485f8d35',
    reportReference: '0g://reports/report_1777390727691.json',
    reportHash: 'sha256:8b5ac39ae14e83e9d889ae2251dafebba2c7565edc9f92a19cc86ccb1a2f21cb',
    persistedAt: '2026-04-28T14:56:11.921Z',
    traceStatus: '0g-storage persisted',
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
    manifestVersion: 'solidity-pattern-scanner@0.1.0',
    summary: [
      'HIGH · Reentrancy risk in withdraw() — Unchecked external call before state update can enable reentrancy in withdraw().',
      'LOW · Administrative path lacks event emission — Owner-controlled actions should emit events for auditability.',
      'MEDIUM · Pause flow lacks obvious negative-path assertion — Consider adding paused-state transfer checks or follow-up tests.',
    ],
  },
  artifact: {
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

const repoRoot = path.resolve(process.cwd(), '..', '..');
const storageRoot = path.join(repoRoot, '.opentoolmesh', 'storage');

function readJsonFile<T>(filePath: string): T {
  return JSON.parse(readFileSync(filePath, 'utf8')) as T;
}

function getMostRecentTraceFile(): string | null {
  const tracesDir = path.join(storageRoot, 'traces');
  if (!existsSync(tracesDir)) {
    return null;
  }

  const entries = readdirSync(tracesDir)
    .filter((entry) => entry.endsWith('.json'))
    .map((entry) => ({
      entry,
      filePath: path.join(tracesDir, entry),
      mtimeMs: statSync(path.join(tracesDir, entry)).mtimeMs,
    }))
    .sort((left, right) => right.mtimeMs - left.mtimeMs);

  return entries[0]?.filePath ?? null;
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

function buildRuntimeDemoRun() {
  const latestTracePath = getMostRecentTraceFile();
  if (!latestTracePath) {
    return null;
  }

  const trace = readJsonFile<TraceRecord>(latestTracePath);
  if (trace.invocation?.status !== 'ok') {
    return null;
  }

  const reportArtifact = getArtifactByKind(trace, 'audit-report');
  const toolOutputArtifact = getArtifactByKind(trace, 'tool-output');
  const manifestPath = getStorageFilePath(trace.tool?.manifestUri);
  const reportPath = getStorageFilePath(reportArtifact?.uri);
  const toolOutputPath = getStorageFilePath(toolOutputArtifact?.uri);

  if (!manifestPath || !reportPath || !toolOutputPath) {
    return null;
  }

  if (![manifestPath, reportPath, toolOutputPath].every((filePath) => existsSync(filePath))) {
    return null;
  }

  const manifest = readJsonFile<{
    version?: string;
    publisher?: { address?: string };
  }>(manifestPath);
  const report = readJsonFile<ReportRecord>(reportPath);
  const artifact = readJsonFile<ArtifactRecord>(toolOutputPath);

  if (report.findings?.some((finding) => finding.traceId && finding.traceId !== trace.traceId)) {
    return null;
  }

  if (artifact.traceId !== trace.traceId) {
    return null;
  }

  const summary = artifact.output?.summary;
  const findings = report.findings ?? [];
  const topFinding = findings.find((finding) => finding.severity === 'high') ?? findings[0];
  const transportLabel = (trace.invocation?.transport ?? 'axl').toUpperCase();

  return {
    runId: trace.runId ?? trace.traceId,
    environment: 'Demo Environment · ENS + 0G + AXL',
    headerStatus: [
      { label: 'Verified', tone: 'success' as ChipTone },
      { label: transportLabel, tone: 'info' as ChipTone },
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
      Publish: `Manifest published at ${trace.tool?.manifestUri ?? fixtureDemoRun.manifest.uri}.`,
      Discover: `Resolved ${trace.tool?.ensName ?? fixtureDemoRun.discovery.ensName} at ${trace.discovery?.resolvedAt ?? 'unknown time'}.`,
      Verify: `verified at ${trace.verification?.verifiedAt ?? 'unknown time'}.`,
      Call: `${trace.invocation?.status ?? 'unknown'} over ${transportLabel} from ${trace.invocation?.startedAt ?? 'unknown start'} to ${trace.invocation?.finishedAt ?? 'unknown end'}.`,
      Trace: `Persisted to ${trace.storage?.traceUri ?? fixtureDemoRun.memory.traceUri} at ${trace.storage?.persistedAt ?? 'unknown time'}.`,
      Report: `Report ${report.reportId} generated at ${report.generatedAt ?? 'unknown time'}.`,
    },
    discovery: {
      requestedCapability: trace.requestedCapability ?? fixtureDemoRun.discovery.requestedCapability,
      resolvedIdentity: trace.tool?.toolId ?? fixtureDemoRun.discovery.resolvedIdentity,
      ensName: trace.tool?.ensName ?? fixtureDemoRun.discovery.ensName,
      tool: (trace.tool?.toolId ?? fixtureDemoRun.discovery.tool).split(':').pop() ?? fixtureDemoRun.discovery.tool,
      capabilityIndex: trace.discovery?.capabilityIndexUri ?? fixtureDemoRun.discovery.capabilityIndex,
      capabilityMatches: `${trace.discovery?.candidateCount ?? 1} candidate tool selected`,
      selectedReason: trace.discovery?.selectedReason ?? fixtureDemoRun.discovery.selectedReason,
      resolvedAt: trace.discovery?.resolvedAt ?? fixtureDemoRun.discovery.resolvedAt,
      invocationMode: 'Latest successful demo:run runtime',
    },
    manifest: {
      uri: trace.tool?.manifestUri ?? fixtureDemoRun.manifest.uri,
      version: trace.tool?.version ?? manifest.version ?? fixtureDemoRun.manifest.version,
      owner: trace.tool?.ownerAddress ?? manifest.publisher?.address ?? fixtureDemoRun.manifest.owner,
      verificationOutcome: 'verified',
      hashStatus: trace.verification?.manifestHashValid ? 'verified' : 'unknown',
      ownerStatus: trace.verification?.ownerValid ? 'verified' : 'unknown',
      schemaStatus: trace.verification?.schemaValid ? 'verified' : 'unknown',
      versionStatus: trace.verification?.versionCompatible ? 'compatible' : 'unknown',
      compatibility: `^${trace.tool?.version ?? manifest.version ?? fixtureDemoRun.manifest.version}`,
      hash: trace.tool?.manifestHash ?? fixtureDemoRun.manifest.hash,
      verifiedAt: trace.verification?.verifiedAt ?? fixtureDemoRun.manifest.verifiedAt,
    },
    invocation: {
      agent: report.contractName ? `${report.contractName} Audit Agent` : fixtureDemoRun.invocation.agent,
      remoteNode: trace.tool?.ensName?.split('.').shift() ?? fixtureDemoRun.invocation.remoteNode,
      peer: trace.invocation?.peerId ?? fixtureDemoRun.invocation.peer,
      method: trace.invocation?.method ?? fixtureDemoRun.invocation.method,
      transport: transportLabel,
      status: trace.invocation?.status ?? fixtureDemoRun.invocation.status,
      requestSummary: `${trace.requestedCapability ?? fixtureDemoRun.discovery.requestedCapability} · ${trace.io?.inputHash ?? fixtureDemoRun.memory.inputHash}`,
      responseSummary: `${summary?.totalFindings ?? findings.length} findings · high ${summary?.high ?? 0} · medium ${summary?.medium ?? 0} · low ${summary?.low ?? 0}`,
      findingsBadge: `Structured response · findings: ${summary?.totalFindings ?? findings.length}`,
      startedAt: trace.invocation?.startedAt ?? fixtureDemoRun.invocation.startedAt,
      finishedAt: trace.invocation?.finishedAt ?? fixtureDemoRun.invocation.finishedAt,
    },
    memory: {
      traceUri: trace.storage?.traceUri ?? fixtureDemoRun.memory.traceUri,
      inputHash: trace.io?.inputHash ?? fixtureDemoRun.memory.inputHash,
      outputHash: trace.io?.outputHash ?? fixtureDemoRun.memory.outputHash,
      artifactReference: toolOutputArtifact?.uri ?? fixtureDemoRun.memory.artifactReference,
      artifactHash: toolOutputArtifact?.hash ?? fixtureDemoRun.memory.artifactHash,
      reportReference: reportArtifact?.uri ?? fixtureDemoRun.memory.reportReference,
      reportHash: reportArtifact?.hash ?? fixtureDemoRun.memory.reportHash,
      persistedAt: trace.storage?.persistedAt ?? fixtureDemoRun.memory.persistedAt,
      traceStatus: `${trace.storage?.backend ?? 'storage'} persisted`,
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
      manifestVersion: `${trace.tool?.ensName?.split('.').shift() ?? 'tool'}@${trace.tool?.version ?? manifest.version ?? fixtureDemoRun.manifest.version}`,
      summary: findings.map(
        (finding) =>
          `${(finding.severity ?? 'low').toUpperCase()} · ${finding.title ?? 'Untitled finding'} — ${finding.description ?? 'No description provided.'}`,
      ),
    },
    artifact,
  };
}

export const demoRun = buildRuntimeDemoRun() ?? fixtureDemoRun;
