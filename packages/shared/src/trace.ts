export interface ExecutionTrace {
  traceId: string;
  runId: string;
  agentId: string;
  requestedCapability: string;
  tool: {
    toolId: string;
    ensName: string;
    manifestUri: string;
    manifestHash: string;
    version: string;
    ownerAddress: `0x${string}`;
  };
  discovery: {
    capabilityIndexUri?: string;
    candidateCount: number;
    selectedReason: string;
    resolvedAt: string;
  };
  verification: {
    manifestHashValid: boolean;
    ownerValid: boolean;
    schemaValid: boolean;
    versionCompatible: boolean;
    rejectedReason?: string;
    verifiedAt: string;
  };
  invocation: {
    transport: "axl";
    peerId: string;
    method: string;
    requestUri?: string;
    responseUri?: string;
    startedAt: string;
    finishedAt?: string;
    status: "pending" | "ok" | "error" | "rejected";
  };
  io: {
    inputHash: string;
    outputHash?: string;
    inputSchemaRef?: string;
    outputSchemaRef?: string;
  };
  artifacts: Array<{
    kind: "tool-output" | "audit-report" | "log" | "finding";
    uri: string;
    hash: string;
    mediaType: string;
  }>;
  storage: {
    traceUri: string;
    persistedAt: string;
    backend: "0g-storage";
  };
}

export interface AuditReport {
  reportId: string;
  contractName?: string;
  summary: string;
  findings: Array<{
    id: string;
    severity: "low" | "medium" | "high" | "critical";
    title: string;
    description: string;
    evidence?: string;
    traceId: string;
    toolId: string;
  }>;
  suggestedTests?: Array<{
    title: string;
    description: string;
    traceId: string;
  }>;
  generatedAt: string;
}

