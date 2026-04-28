import manifest from '../../../manifests/solidity-pattern-scanner.manifest.json';
import artifact from '../../../.opentoolmesh/storage/artifacts/18a821cd-57ec-4cf4-8bd1-2c72f5ef64b9.json';
import report from '../../../.opentoolmesh/storage/reports/report_1777388349430.json';
import executionTrace from '../../../.opentoolmesh/storage/traces/18a821cd-57ec-4cf4-8bd1-2c72f5ef64b9.json';

const findingCount = report.findings.length;
const severityOrder = ['high', 'medium', 'low'] as const;
const severityCounts = severityOrder.map((label) => ({
  label: label.charAt(0).toUpperCase() + label.slice(1),
  value: report.findings.filter((finding) => finding.severity === label).length,
  tone: label as 'high' | 'medium' | 'low',
}));
const topFinding = report.findings[0];

export const demoRun = {
  runId: executionTrace.runId,
  environment: 'Demo Environment · ENS + 0G + AXL',
  headerStatus: [
    { label: 'Verified', tone: 'success' as const },
    { label: 'AXL Live', tone: 'info' as const },
    { label: 'Trace Stored', tone: 'success' as const },
  ],
  lifecycleState: {
    Publish: 'done',
    Discover: 'done',
    Verify: 'done',
    Call: 'active',
    Trace: 'done',
    Report: 'done',
  } as const,
  stepDetails: {
    Publish: 'Manifest uploaded to 0G with capability index seeded.',
    Discover: 'Capability query resolved ENS tool identity.',
    Verify: 'Manifest hash, owner, version, and schema checked.',
    Call: 'Audit agent invoked remote node over AXL.',
    Trace: 'Request, response, and artifacts persisted to 0G.',
    Report: 'Final audit report references trace provenance.',
  },
  discovery: {
    requestedCapability: executionTrace.requestedCapability,
    resolvedIdentity: executionTrace.tool.toolId,
    tool: manifest.mcp.toolName,
    optionalNode: 'test-case-suggester',
    capabilityMatches: `${executionTrace.discovery.candidateCount} candidate tool selected from capability index`,
    invocationMode: 'Discovered via capability index and ENS resolution, not a hardcoded endpoint.',
  },
  manifest: {
    uri: executionTrace.tool.manifestUri,
    version: executionTrace.tool.version,
    owner: executionTrace.tool.ownerAddress,
    schemaStatus: executionTrace.verification.schemaValid ? 'verified' : 'invalid',
    ownerSignature: executionTrace.verification.ownerValid ? 'valid' : 'invalid',
    compatibility: manifest.compatibility.sdkVersionRange,
    hash: executionTrace.tool.manifestHash,
  },
  invocation: {
    agent: 'Solidity Audit Agent',
    remoteNode: manifest.mcp.toolName,
    peer: executionTrace.invocation.peerId,
    status: executionTrace.invocation.status,
    requestSummary: 'Contract source + capability request + trace context',
    responseSummary: `${findingCount} findings returned with severity and evidence`,
    findingsBadge: `Structured response · findings: ${findingCount}`,
  },
  memory: {
    traceUri: executionTrace.storage.traceUri,
    inputHash: executionTrace.io.inputHash,
    outputHash: executionTrace.io.outputHash,
    artifactReference: artifact.traceId
      ? executionTrace.artifacts.find((item) => item.kind === 'tool-output')?.uri ?? '0g://artifacts/unavailable'
      : '0g://artifacts/unavailable',
    reportReference:
      executionTrace.artifacts.find((item) => item.kind === 'audit-report')?.uri ?? '0g://reports/unavailable',
    traceStatus: 'stored with provenance',
  },
  report: {
    title: topFinding?.title ?? 'No findings recorded',
    findings: findingCount,
    severity: severityCounts,
    traceReference: executionTrace.storage.traceUri,
    manifestVersion: `${manifest.mcp.toolName}@${executionTrace.tool.version}`,
    summary: report.findings.map((finding) => finding.description),
  },
};
