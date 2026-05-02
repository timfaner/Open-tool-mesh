import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

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

const tempRoot = mkdtempSync(path.join(os.tmpdir(), 'otm-dashboard-'));
const repoRoot = path.join(tempRoot, 'repo');
const storageRoot = path.join(repoRoot, '.opentoolmesh', 'storage');
const tracesDir = path.join(storageRoot, 'traces');
const manifestsDir = path.join(storageRoot, 'manifests');
const reportsDir = path.join(storageRoot, 'reports');
const artifactsDir = path.join(storageRoot, 'artifacts');

mkdirSync(tracesDir, { recursive: true });
mkdirSync(manifestsDir, { recursive: true });
mkdirSync(reportsDir, { recursive: true });
mkdirSync(artifactsDir, { recursive: true });

process.env.OPENTOOLMESH_DASHBOARD_REPO_ROOT = repoRoot;

const { getDashboardRun } = await import('../lib/demo-run.ts');

function writeJson(filePath: string, value: unknown) {
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, JSON.stringify(value, null, 2));
}

function writeRuntimeBundle(id: string, options: { persistedAt: string; status?: string; withArtifacts?: boolean; withResolveEvidence?: boolean }) {
  const manifestUri = `0g://manifests/${id}.json`;
  const reportUri = `0g://reports/${id}.json`;
  const artifactUri = `0g://artifacts/${id}.json`;
  const traceUri = `0g://traces/${id}.json`;
  const status = options.status ?? 'ok';
  const withArtifacts = options.withArtifacts ?? true;
  const withResolveEvidence = options.withResolveEvidence ?? true;

  const trace: TraceRecord = {
    traceId: id,
    runId: id,
    requestedCapability: 'solidity-static-analysis',
    tool: {
      toolId: 'otm:ens:solidity-scanner.auditagent.eth',
      ensName: 'solidity-scanner.auditagent.eth',
      manifestUri,
      manifestHash: `sha256:${id}-manifest`,
      version: '0.1.0',
      ownerAddress: '0x1234567890abcdef1234567890abcdef12345678',
    },
    discovery: {
      candidateCount: 1,
      capabilityIndexUri: '0g://indexes/capabilities/solidity-static-analysis.json',
      selectedReason: 'selected from capability discovery candidates',
      resolvedAt: options.persistedAt,
      resolve: withResolveEvidence
        ? {
            ensName: 'solidity-scanner.auditagent.eth',
            identityId: 'otm:ens:solidity-scanner.auditagent.eth',
            manifestUri,
            manifestHash: `sha256:${id}-manifest`,
            version: '0.1.0',
            ownerAddress: '0x1234567890abcdef1234567890abcdef12345678',
            evidence: `discover(solidity-static-analysis) -> resolveIdentity(solidity-scanner.auditagent.eth) -> loadManifest(${manifestUri}) -> verifyManifest -> invokeTool`,
          }
        : undefined,
    },
    verification: {
      manifestHashValid: true,
      ownerValid: true,
      schemaValid: true,
      versionCompatible: true,
      verifiedAt: options.persistedAt,
    },
    invocation: {
      transport: 'axl',
      peerId: 'axl-peer-solidity-01',
      method: 'invokeTool',
      startedAt: options.persistedAt,
      finishedAt: options.persistedAt,
      status,
    },
    io: {
      inputHash: `sha256:${id}-input`,
      outputHash: `sha256:${id}-output`,
    },
    artifacts: withArtifacts
      ? [
          { kind: 'tool-output', uri: artifactUri, hash: `sha256:${id}-artifact` },
          { kind: 'audit-report', uri: reportUri, hash: `sha256:${id}-report` },
        ]
      : [],
    storage: {
      traceUri,
      persistedAt: options.persistedAt,
      backend: '0g-storage',
    },
  };

  writeJson(path.join(tracesDir, `${id}.json`), trace);

  if (!withArtifacts) {
    return;
  }

  writeJson(path.join(manifestsDir, `${id}.json`), {
    version: '0.1.0',
    owner: { address: '0x1234567890abcdef1234567890abcdef12345678' },
    compatibility: { sdkVersionRange: '^0.1.0' },
    mcp: { toolName: 'solidity-pattern-scanner' },
  });
  writeJson(path.join(reportsDir, `${id}.json`), {
    reportId: `report-${id}`,
    traceId: id,
    traceUri,
    manifestUri,
    contractName: 'Vault',
    summary: 'Runtime summary',
    findings: [
      { severity: 'high', title: 'Finding', description: 'Description', traceId: id },
      { severity: 'medium', title: 'Secondary finding', description: 'Secondary description', traceId: id },
    ],
    generatedAt: options.persistedAt,
  });
  writeJson(path.join(artifactsDir, `${id}.json`), {
    traceId: id,
    toolId: 'otm:ens:solidity-scanner.auditagent.eth',
    output: {
      findings: [
        { severity: 'high', message: 'Description' },
        { severity: 'medium', message: 'Secondary description' },
      ],
      summary: { totalFindings: 2, high: 1, medium: 1, low: 0 },
    },
  });
}

function writeProviderRootRuntimeBundle(id: string, persistedAt: string) {
  const manifestUri = '0g://root/provider-manifest-root';
  const traceUri = '0g://root/provider-trace-root';
  const reportUri = '0g://root/provider-report-root';
  const artifactUri = '0g://root/provider-output-root';

  const trace: TraceRecord = {
    traceId: id,
    runId: id,
    requestedCapability: 'solidity-static-analysis',
    tool: {
      toolId: 'otm:ens:provider-scanner.auditagent.eth',
      ensName: 'provider-scanner.auditagent.eth',
      manifestUri,
      manifestHash: 'sha256:provider-manifest',
      version: '0.1.0',
      ownerAddress: '0x1234567890abcdef1234567890abcdef12345678',
    },
    discovery: {
      candidateCount: 1,
      capabilityIndexUri: '0g://kv/capability:solidity-static-analysis',
      selectedReason: 'selected from 0G KV capability discovery candidates before ENS resolution',
      resolvedAt: persistedAt,
      resolve: {
        ensName: 'provider-scanner.auditagent.eth',
        identityId: 'otm:ens:provider-scanner.auditagent.eth',
        manifestUri,
        manifestHash: 'sha256:provider-manifest',
        version: '0.1.0',
        ownerAddress: '0x1234567890abcdef1234567890abcdef12345678',
        evidence: `discover(solidity-static-analysis) -> resolveIdentity(provider-scanner.auditagent.eth) -> loadManifest(${manifestUri}) -> verifyManifest -> invokeTool`,
      },
    },
    verification: {
      manifestHashValid: true,
      ownerValid: true,
      schemaValid: true,
      versionCompatible: true,
      verifiedAt: persistedAt,
    },
    invocation: {
      transport: 'axl',
      peerId: 'axl-peer-provider-01',
      method: 'invokeTool',
      startedAt: persistedAt,
      finishedAt: persistedAt,
      status: 'ok',
    },
    io: {
      inputHash: 'sha256:provider-input',
      outputHash: 'sha256:provider-output',
    },
    artifacts: [
      { kind: 'tool-output', uri: artifactUri, hash: 'sha256:provider-output-artifact' },
      { kind: 'audit-report', uri: reportUri, hash: 'sha256:provider-report' },
    ],
    storage: {
      traceUri,
      persistedAt,
      backend: '0g-storage',
    },
  };

  writeJson(path.join(tracesDir, `${id}.json`), trace);
  writeJson(path.join(storageRoot, 'root', 'provider-manifest-root'), {
    version: '0.1.0',
    owner: { address: '0x1234567890abcdef1234567890abcdef12345678' },
    compatibility: { sdkVersionRange: '^0.1.0' },
    mcp: { toolName: 'provider-solidity-pattern-scanner' },
  });
  writeJson(path.join(storageRoot, 'root', 'provider-report-root'), {
    reportId: `report-${id}`,
    traceId: id,
    traceUri,
    manifestUri,
    contractName: 'Vault',
    summary: 'Provider runtime summary',
    findings: [{ severity: 'high', title: 'Provider finding', description: 'Provider description', traceId: id }],
    generatedAt: persistedAt,
  });
  writeJson(path.join(storageRoot, 'root', 'provider-output-root'), {
    traceId: id,
    toolId: 'otm:ens:provider-scanner.auditagent.eth',
    output: {
      findings: [{ severity: 'high', message: 'Provider description' }],
      summary: { totalFindings: 1, high: 1, medium: 0, low: 0 },
    },
  });
}

test.after(() => {
  rmSync(tempRoot, { recursive: true, force: true });
  delete process.env.OPENTOOLMESH_DASHBOARD_REPO_ROOT;
});

test('prefers the latest complete successful runtime instead of falling back after a newer failure', async () => {
  writeRuntimeBundle('older-success', { persistedAt: '2026-04-28T15:00:00.000Z' });
  writeRuntimeBundle('newer-failure', { persistedAt: '2026-04-28T16:00:00.000Z', status: 'error' });

  const demoRun = await getDashboardRun();

  assert.equal(demoRun.source, 'runtime');
  assert.equal(demoRun.runId, 'older-success');
  assert.equal(demoRun.memory.traceId, 'older-success');
});

test('skips incomplete runtime bundles and keeps searching older successful runs', async () => {
  writeRuntimeBundle('older-complete', { persistedAt: '2026-04-28T17:00:00.000Z' });
  writeRuntimeBundle('newer-incomplete', { persistedAt: '2026-04-28T18:00:00.000Z', withArtifacts: false });

  const demoRun = await getDashboardRun();

  assert.equal(demoRun.source, 'runtime');
  assert.equal(demoRun.runId, 'older-complete');
  assert.equal(demoRun.memory.traceId, 'older-complete');
});

test('requires explicit resolve evidence before treating runtime data as authoritative', async () => {
  writeRuntimeBundle('success-with-evidence', { persistedAt: '2026-04-28T19:00:00.000Z' });
  writeRuntimeBundle('newer-no-evidence', {
    persistedAt: '2026-04-28T20:00:00.000Z',
    withResolveEvidence: false,
  });

  const demoRun = await getDashboardRun();

  assert.equal(demoRun.source, 'runtime');
  assert.equal(demoRun.runId, 'success-with-evidence');
  assert.match(demoRun.stepDetails.Discover, /resolveIdentity/);
  assert.match(demoRun.stepDetails.Discover, /loadManifest/);
});

test('rejects runtime bundles when report trace linkage does not match the selected trace', async () => {
  writeRuntimeBundle('valid-runtime', { persistedAt: '2026-04-28T21:00:00.000Z' });
  writeRuntimeBundle('mismatched-report', { persistedAt: '2026-04-28T22:00:00.000Z' });

  writeJson(path.join(reportsDir, 'mismatched-report.json'), {
    reportId: 'report-mismatched-report',
    traceId: 'another-trace',
    traceUri: '0g://traces/another-trace.json',
    manifestUri: '0g://manifests/another-trace.json',
    contractName: 'Vault',
    summary: 'Mismatched summary',
    findings: [{ severity: 'high', title: 'Finding', description: 'Description', traceId: 'another-trace' }],
    generatedAt: '2026-04-28T22:00:00.000Z',
  });

  const demoRun = await getDashboardRun();

  assert.equal(demoRun.source, 'runtime');
  assert.equal(demoRun.runId, 'valid-runtime');
  assert.equal(demoRun.memory.traceId, 'valid-runtime');
});

test('uses manifest mcp toolName instead of guessing from the ENS prefix', async () => {
  writeRuntimeBundle('tool-name-runtime', { persistedAt: '2026-04-28T23:00:00.000Z' });

  const demoRun = await getDashboardRun();

  assert.equal(demoRun.source, 'runtime');
  assert.equal(demoRun.invocation.remoteNode, 'solidity-pattern-scanner');
  assert.equal(demoRun.report.toolReference, 'solidity-pattern-scanner');
});

test('formats the contract reference as Vault.sol in runtime header-facing data', async () => {
  writeRuntimeBundle('contract-reference-runtime', { persistedAt: '2026-04-29T00:00:00.000Z' });

  const demoRun = await getDashboardRun();

  assert.equal(demoRun.source, 'runtime');
  assert.equal(demoRun.contractReference, 'Vault.sol');
  assert.equal(demoRun.invocation.requestSummary, 'solidity-static-analysis against Vault.sol');
});

test('keeps the top finding separate from the secondary issue summary', async () => {
  writeRuntimeBundle('secondary-finding-runtime', { persistedAt: '2026-04-29T01:00:00.000Z' });

  const demoRun = await getDashboardRun();

  assert.equal(demoRun.source, 'runtime');
  assert.equal(demoRun.report.title, 'Finding');
  assert.equal(
    demoRun.report.secondaryFinding,
    'MEDIUM · Secondary finding — Secondary description',
  );
});

test('loads provider-backed root URI mirrors as a complete runtime run', async () => {
  writeProviderRootRuntimeBundle('provider-root-runtime', '2026-04-29T02:00:00.000Z');

  const demoRun = await getDashboardRun();

  assert.equal(demoRun.source, 'runtime');
  assert.equal(demoRun.runId, 'provider-root-runtime');
  assert.equal(demoRun.manifest.uri, '0g://root/provider-manifest-root');
  assert.equal(demoRun.invocation.peer, 'axl-peer-provider-01');
  assert.equal(demoRun.memory.traceUri, '0g://root/provider-trace-root');
  assert.equal(demoRun.report.reportUri, '0g://root/provider-report-root');
  assert.equal(demoRun.report.toolReference, 'provider-solidity-pattern-scanner');
});
