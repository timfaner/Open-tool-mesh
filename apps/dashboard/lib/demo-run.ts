import manifest from '../../../manifests/solidity-pattern-scanner.manifest.json';
import artifact from '../../../examples/audit-agent/fixtures/sample-tool-output.json';
import report from '../../../examples/audit-agent/fixtures/sample-report.json';
import executionTrace from '../../../examples/audit-agent/fixtures/sample-execution-trace.json';

type FindingSeverity = 'high' | 'medium' | 'low';
type HeaderTone = 'success' | 'info';
type LifecycleState = 'done';

interface DashboardFinding {
  severity: FindingSeverity | 'critical';
  title: string;
  description: string;
  traceId: string;
}

interface DashboardArtifactEntry {
  kind: string;
  uri: string;
  hash: string;
}

interface DashboardExecutionTrace {
  runId: string;
  traceId: string;
  requestedCapability: string;
  tool: {
    toolId: string;
    ensName: string;
    manifestUri: string;
    manifestHash: string;
    version: string;
    ownerAddress: string;
  };
  discovery: {
    capabilityIndexUri?: string;
    candidateCount: number;
    selectedReason: string;
    resolvedAt: string;
  };
  verification: {
    manifestHashValid: boolean;
    schemaValid: boolean;
    versionCompatible: boolean;
    rejectedReason?: string;
    verifiedAt: string;
  };
  invocation: {
    peerId: string;
    status: string;
    startedAt: string;
    finishedAt?: string;
  };
  io: {
    inputHash: string;
    outputHash?: string;
  };
  artifacts: DashboardArtifactEntry[];
  storage: {
    traceUri: string;
    persistedAt: string;
    backend: string;
  };
}

interface DashboardReport {
  reportId: string;
  summary: string;
  generatedAt: string;
  findings: DashboardFinding[];
}

const typedExecutionTrace = executionTrace as DashboardExecutionTrace;
const typedReport = report as DashboardReport;
const typedArtifact = artifact as {
  output: {
    findings: Array<{ severity: FindingSeverity | 'critical'; message: string }>;
    summary: {
      totalFindings: number;
      high: number;
      medium: number;
      low: number;
    };
  };
};

function toDisplayTime(value: string | undefined) {
  if (!value) {
    return 'not recorded';
  }

  return new Date(value).toISOString();
}

function getVerificationOutcome() {
  const rejectedReason = typedExecutionTrace.verification.rejectedReason;

  if (rejectedReason) {
    return `rejected · ${rejectedReason}`;
  }

  return typedExecutionTrace.verification.manifestHashValid &&
    typedExecutionTrace.verification.schemaValid &&
    typedExecutionTrace.verification.versionCompatible
    ? 'verified'
    : 'check failed';
}

const findingCount = typedReport.findings.length;
const severityOrder = ['high', 'medium', 'low'] as const;
const severityCounts = severityOrder.map((label) => ({
  label: label.charAt(0).toUpperCase() + label.slice(1),
  value: typedReport.findings.filter((finding) => finding.severity === label).length,
  tone: label as 'high' | 'medium' | 'low',
}));
const topFinding = typedReport.findings[0];
const toolOutputArtifact = typedExecutionTrace.artifacts.find((item) => item.kind === 'tool-output');
const reportArtifact = typedExecutionTrace.artifacts.find((item) => item.kind === 'audit-report');
const verificationOutcome = getVerificationOutcome();
const capabilityIndexUri = typedExecutionTrace.discovery.capabilityIndexUri;

export const demoRun = {
  runId: typedExecutionTrace.runId,
  environment: 'Demo Environment · ENS + 0G + AXL',
  headerStatus: [
    { label: verificationOutcome === 'verified' ? 'Verified' : verificationOutcome, tone: 'success' as HeaderTone },
    { label: manifest.invocation.transport.toUpperCase(), tone: 'info' as HeaderTone },
    { label: 'Trace Stored', tone: 'success' as HeaderTone },
  ],
  lifecycleState: {
    Publish: 'done',
    Discover: 'done',
    Verify: 'done',
    Call: 'done',
    Trace: 'done',
    Report: 'done',
  } as Record<'Publish' | 'Discover' | 'Verify' | 'Call' | 'Trace' | 'Report', LifecycleState>,
  stepDetails: {
    Publish: `Manifest published at ${manifest.storage.manifestUri}.`,
    Discover: `Resolved ${typedExecutionTrace.tool.ensName} at ${toDisplayTime(typedExecutionTrace.discovery.resolvedAt)}.`,
    Verify: `${verificationOutcome} at ${toDisplayTime(typedExecutionTrace.verification.verifiedAt)}.`,
    Call: `${typedExecutionTrace.invocation.status} over AXL from ${toDisplayTime(typedExecutionTrace.invocation.startedAt)} to ${toDisplayTime(typedExecutionTrace.invocation.finishedAt)}.`,
    Trace: `Persisted to ${typedExecutionTrace.storage.traceUri} at ${toDisplayTime(typedExecutionTrace.storage.persistedAt)}.`,
    Report: `Report ${typedReport.reportId} generated at ${toDisplayTime(typedReport.generatedAt)}.`,
  },
  discovery: {
    requestedCapability: typedExecutionTrace.requestedCapability,
    resolvedIdentity: typedExecutionTrace.tool.toolId,
    tool: manifest.mcp.toolName,
    capabilityIndex: capabilityIndexUri ?? 'not recorded',
    capabilityMatches: `${typedExecutionTrace.discovery.candidateCount} candidate tool selected from capability index`,
    selectedReason: typedExecutionTrace.discovery.selectedReason,
    resolvedAt: toDisplayTime(typedExecutionTrace.discovery.resolvedAt),
    invocationMode: 'Discovered via capability index and ENS resolution, not a hardcoded endpoint.',
  },
  manifest: {
    uri: typedExecutionTrace.tool.manifestUri,
    version: typedExecutionTrace.tool.version,
    owner: typedExecutionTrace.tool.ownerAddress,
    verificationOutcome,
    hashStatus: typedExecutionTrace.verification.manifestHashValid ? 'verified' : 'rejected',
    schemaStatus: typedExecutionTrace.verification.schemaValid ? 'verified' : 'invalid',
    versionStatus: typedExecutionTrace.verification.versionCompatible ? 'compatible' : 'rejected',
    compatibility: manifest.compatibility.sdkVersionRange,
    hash: typedExecutionTrace.tool.manifestHash,
    verifiedAt: toDisplayTime(typedExecutionTrace.verification.verifiedAt),
  },
  invocation: {
    agent: 'Solidity Audit Agent',
    remoteNode: manifest.mcp.toolName,
    peer: typedExecutionTrace.invocation.peerId,
    status: typedExecutionTrace.invocation.status,
    requestSummary: `${typedExecutionTrace.requestedCapability} · ${typedExecutionTrace.io.inputHash}`,
    responseSummary: `${typedArtifact.output.summary.totalFindings} findings · high ${typedArtifact.output.summary.high} · medium ${typedArtifact.output.summary.medium} · low ${typedArtifact.output.summary.low}`,
    findingsBadge: `Structured response · findings: ${typedArtifact.output.summary.totalFindings}`,
    startedAt: toDisplayTime(typedExecutionTrace.invocation.startedAt),
    finishedAt: toDisplayTime(typedExecutionTrace.invocation.finishedAt),
  },
  memory: {
    traceUri: typedExecutionTrace.storage.traceUri,
    inputHash: typedExecutionTrace.io.inputHash,
    outputHash: typedExecutionTrace.io.outputHash ?? 'not recorded',
    artifactReference: toolOutputArtifact?.uri ?? '0g://artifacts/unavailable',
    artifactHash: toolOutputArtifact?.hash ?? 'sha256:unavailable',
    reportReference: reportArtifact?.uri ?? '0g://reports/unavailable',
    reportHash: reportArtifact?.hash ?? 'sha256:unavailable',
    persistedAt: toDisplayTime(typedExecutionTrace.storage.persistedAt),
    traceStatus: `${typedExecutionTrace.storage.backend} persisted`,
  },
  report: {
    reportId: typedReport.reportId,
    reportUri: reportArtifact?.uri ?? '0g://reports/unavailable',
    title: topFinding?.title ?? 'No findings recorded',
    findings: findingCount,
    severity: severityCounts,
    summaryText: typedReport.summary,
    generatedAt: toDisplayTime(typedReport.generatedAt),
    traceReference: typedReport.findings[0]?.traceId ?? typedExecutionTrace.traceId,
    manifestVersion: `${manifest.mcp.toolName}@${typedExecutionTrace.tool.version}`,
    summary: typedReport.findings.map((finding) => finding.description),
  },
  artifact: typedArtifact,
};
