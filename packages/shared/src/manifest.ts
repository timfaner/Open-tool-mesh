export interface ToolIdentity {
  id: string;
  ensName: string;
  ownerAddress: `0x${string}`;
  latestManifestUri: string;
  latestManifestHash: string;
  latestVersion: string;
  capabilities: string[];
}

export interface ToolManifest {
  schemaVersion: "otm.manifest.v1";
  toolId: string;
  name: string;
  version: string;
  description: string;
  owner: {
    ensName?: string;
    address: `0x${string}`;
    signature?: string;
    publicKey?: string;
  };
  capabilities: Array<{
    id: string;
    description: string;
    tags?: string[];
  }>;
  mcp: {
    toolName: string;
    protocol: "mcp-compatible";
    inputSchema: Record<string, unknown>;
    outputSchema: Record<string, unknown>;
  };
  invocation: {
    transport: "axl";
    axlPeerId: string;
    axlMethod: string;
    timeoutMs: number;
    regionHint?: string;
  };
  storage: {
    manifestUri: string;
    artifactBaseUri?: string;
    traceNamespace: string;
  };
  compatibility: {
    sdkVersionRange: string;
    manifestApiVersion: "v1";
  };
  integrity: {
    manifestHash: string;
    createdAt: string;
  };
}

export interface CapabilityIndexEntry {
  capability: string;
  tools: Array<{
    toolId: string;
    ensName: string;
    manifestUri: string;
    manifestHash: string;
    version: string;
    ownerAddress: `0x${string}`;
    updatedAt: string;
    priority?: number;
  }>;
}

