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
  });
  writeJson(path.join(reportsDir, `${id}.json`), {
    reportId: `report-${id}`,
    contractName: 'Vault',
    summary: 'Runtime summary',
    findings: [{ severity: 'high', title: 'Finding', description: 'Description', traceId: id }],
    generatedAt: options.persistedAt,
  });
  writeJson(path.join(artifactsDir, `${id}.json`), {
    traceId: id,
    output: {
      findings: [{ severity: 'high', message: 'Description' }],
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
