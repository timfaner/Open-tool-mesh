import manifest from '../../../manifests/solidity-pattern-scanner.manifest.json';
import artifact from '../../../.opentoolmesh/storage/artifacts/18a821cd-57ec-4cf4-8bd1-2c72f5ef64b9.json';
import report from '../../../.opentoolmesh/storage/reports/report_1777388349430.json';
import executionTrace from '../../../.opentoolmesh/storage/traces/18a821cd-57ec-4cf4-8bd1-2c72f5ef64b9.json';

function toDisplayTime(value: string | undefined) {
  if (!value) {
    return 'not recorded';
  }

  return new Date(value).toISOString();
}

function getVerificationOutcome() {
  const rejectedReason = (executionTrace.verification as { rejectedReason?: string }).rejectedReason;

  if (rejectedReason) {
    return `rejected · ${rejectedReason}`;
  }

  return executionTrace.verification.manifestHashValid &&
    executionTrace.verification.schemaValid &&
    executionTrace.verification.versionCompatible
    ? 'verified'
    : 'check failed';
}

const findingCount = report.findings.length;
const severityOrder = ['high', 'medium', 'low'] as const;
const severityCounts = severityOrder.map((label) => ({
  label: label.charAt(0).toUpperCase() + label.slice(1),
  value: report.findings.filter((finding) => finding.severity === label).length,
  tone: label as 'high' | 'medium' | 'low',
}));
const topFinding = report.findings[0];
const toolOutputArtifact = executionTrace.artifacts.find((item) => item.kind === 'tool-output');
const reportArtifact = executionTrace.artifacts.find((item) => item.kind === 'audit-report');
const verificationOutcome = getVerificationOutcome();
const capabilityIndexUri = (executionTrace.discovery as { capabilityIndexUri?: string }).capabilityIndexUri;

export const demoRun = {
  runId: executionTrace.runId,
  environment: 'Demo Environment · ENS + 0G + AXL',
  headerStatus: [
    { label: verificationOutcome === 'verified' ? 'Verified' : verificationOutcome, tone: 'success' as const },
    { label: manifest.invocation.transport.toUpperCase(), tone: 'info' as const },
    { label: 'Trace Stored', tone: 'success' as const },
  ],
  lifecycleState: {
    Publish: 'done',
    Discover: 'done',
    Verify: 'done',
    Call: 'done',
    Trace: 'done',
    Report: 'done',
  } as const,
  stepDetails: {
    Publish: `Manifest published at ${manifest.storage.manifestUri}.`,
    Discover: `Resolved ${executionTrace.tool.ensName} at ${toDisplayTime(executionTrace.discovery.resolvedAt)}.`,
    Verify: `${verificationOutcome} at ${toDisplayTime(executionTrace.verification.verifiedAt)}.`,
    Call: `${executionTrace.invocation.status} over AXL from ${toDisplayTime(executionTrace.invocation.startedAt)} to ${toDisplayTime(executionTrace.invocation.finishedAt)}.`,
    Trace: `Persisted to ${executionTrace.storage.traceUri} at ${toDisplayTime(executionTrace.storage.persistedAt)}.`,
    Report: `Report ${report.reportId} generated at ${toDisplayTime(report.generatedAt)}.`,
  },
  discovery: {
    requestedCapability: executionTrace.requestedCapability,
    resolvedIdentity: executionTrace.tool.toolId,
    tool: manifest.mcp.toolName,
    capabilityIndex: capabilityIndexUri ?? 'not recorded',
    capabilityMatches: `${executionTrace.discovery.candidateCount} candidate tool selected from capability index`,
    selectedReason: executionTrace.discovery.selectedReason,
    resolvedAt: toDisplayTime(executionTrace.discovery.resolvedAt),
    invocationMode: 'Discovered via capability index and ENS resolution, not a hardcoded endpoint.',
  },
  manifest: {
    uri: executionTrace.tool.manifestUri,
    version: executionTrace.tool.version,
    owner: executionTrace.tool.ownerAddress,
    verificationOutcome,
    hashStatus: executionTrace.verification.manifestHashValid ? 'verified' : 'rejected',
    schemaStatus: executionTrace.verification.schemaValid ? 'verified' : 'invalid',
    versionStatus: executionTrace.verification.versionCompatible ? 'compatible' : 'rejected',
    compatibility: manifest.compatibility.sdkVersionRange,
    hash: executionTrace.tool.manifestHash,
    verifiedAt: toDisplayTime(executionTrace.verification.verifiedAt),
  },
  invocation: {
    agent: 'Solidity Audit Agent',
    remoteNode: manifest.mcp.toolName,
    peer: executionTrace.invocation.peerId,
    status: executionTrace.invocation.status,
    requestSummary: `${executionTrace.requestedCapability} · ${executionTrace.io.inputHash}`,
    responseSummary: `${artifact.output.summary.totalFindings} findings · high ${artifact.output.summary.high} · medium ${artifact.output.summary.medium} · low ${artifact.output.summary.low}`,
    findingsBadge: `Structured response · findings: ${artifact.output.summary.totalFindings}`,
    startedAt: toDisplayTime(executionTrace.invocation.startedAt),
    finishedAt: toDisplayTime(executionTrace.invocation.finishedAt),
  },
  memory: {
    traceUri: executionTrace.storage.traceUri,
    inputHash: executionTrace.io.inputHash,
    outputHash: executionTrace.io.outputHash ?? 'not recorded',
    artifactReference: toolOutputArtifact?.uri ?? '0g://artifacts/unavailable',
    artifactHash: toolOutputArtifact?.hash ?? 'sha256:unavailable',
    reportReference: reportArtifact?.uri ?? '0g://reports/unavailable',
    reportHash: reportArtifact?.hash ?? 'sha256:unavailable',
    persistedAt: toDisplayTime(executionTrace.storage.persistedAt),
    traceStatus: `${executionTrace.storage.backend} persisted`,
  },
  report: {
    reportId: report.reportId,
    reportUri: reportArtifact?.uri ?? '0g://reports/unavailable',
    title: topFinding?.title ?? 'No findings recorded',
    findings: findingCount,
    severity: severityCounts,
    summaryText: report.summary,
    generatedAt: toDisplayTime(report.generatedAt),
    traceReference: report.findings[0]?.traceId ?? executionTrace.traceId,
    manifestVersion: `${manifest.mcp.toolName}@${executionTrace.tool.version}`,
    summary: report.findings.map((finding) => finding.description),
  },
  artifact,
};
