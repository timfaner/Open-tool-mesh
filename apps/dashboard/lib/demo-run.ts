import manifest from '../../../manifests/solidity-pattern-scanner.manifest.json';
import executionTrace from '../../../examples/audit-agent/fixtures/sample-execution-trace.json';

const findingCount = 3;

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
    uri: manifest.storage.manifestUri,
    version: manifest.version,
    owner: manifest.owner.address,
    schemaStatus: executionTrace.verification.schemaValid ? 'verified' : 'invalid',
    ownerSignature: executionTrace.verification.ownerValid ? 'valid' : 'invalid',
    compatibility: manifest.compatibility.sdkVersionRange,
    hash: manifest.integrity.manifestHash,
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
    artifactReference: executionTrace.artifacts[0]?.uri ?? '0g://artifacts/unavailable',
    reportReference: `0g://reports/${executionTrace.runId}.md`,
    traceStatus: 'stored with provenance',
  },
  report: {
    title: 'Reentrancy risk in withdraw()',
    findings: findingCount,
    severity: [
      { label: 'High', value: 1, tone: 'high' as const },
      { label: 'Medium', value: 1, tone: 'medium' as const },
      { label: 'Low', value: 1, tone: 'low' as const },
    ],
    traceReference: executionTrace.storage.traceUri,
    manifestVersion: `${manifest.mcp.toolName}@${manifest.version}`,
    summary: [
      'Unchecked external call path exposes a reentrancy window before state finalization.',
      'Owner-only emergency withdrawal lacks event emission, weakening incident forensics.',
      'Missing negative-path tests for paused-state transfers were suggested for the follow-up node.',
    ],
  },
};
