import type { DashboardRun } from '../lib/demo-run';
import { HashPill } from './hash-pill';
import { InfoRow } from './info-row';
import { SectionCard } from './section-card';
import { SeverityBadge } from './severity-badge';
import { StatusChip } from './status-chip';
import { TraceLine } from './trace-line';
import styles from './dashboard-page.module.css';

const lifecycleSteps = ['Publish', 'Discover', 'Verify', 'Call', 'Trace', 'Report'] as const;
const lifecycleLegend = [
  'ENS = identity',
  '0G = storage + memory',
  'AXL = transport',
  'MCP = interface semantics',
] as const;

export function DashboardPage({ demoRun }: { demoRun: DashboardRun }) {
  const secondaryIssue = demoRun.report.secondaryFinding;
  const demoFlow = [
    {
      number: '01',
      title: 'Provide Contract',
      detail: demoRun.contractReference,
      meta: 'Solidity source enters the agent runtime',
    },
    {
      number: '02',
      title: 'Choose Capability',
      detail: demoRun.discovery.requestedCapability,
      meta: 'Agent asks the mesh for a matching tool',
    },
    {
      number: '03',
      title: 'Resolve Tool',
      detail: demoRun.invocation.remoteNode,
      meta: 'ENS identity points at the manifest',
    },
    {
      number: '04',
      title: 'Run Scanner',
      detail: demoRun.invocation.peer,
      meta: 'AXL call reaches the remote tool node',
    },
    {
      number: '05',
      title: 'Review Evidence',
      detail: 'Trace + Report',
      meta: 'Trace, artifacts, and report are persisted',
    },
  ] as const;
  const usageCommands = [
    {
      label: 'Start tool node',
      command: 'corepack pnpm demo:tool-node',
      result: `${demoRun.invocation.remoteNode} listens for ${demoRun.invocation.method}`,
    },
    {
      label: 'Publish manifest',
      command: 'corepack pnpm demo:publish',
      result: demoRun.publish.manifestUri,
    },
    {
      label: 'Run audit agent',
      command: 'corepack pnpm demo:audit-agent',
      result: `${demoRun.report.findings} findings, trace ${demoRun.memory.traceId}`,
    },
    {
      label: 'One-command demo',
      command: 'corepack pnpm demo:run',
      result: 'Builds, publishes, invokes, traces, and reports',
    },
  ] as const;
  const evidenceRows = [
    { label: 'input', value: demoRun.contractReference },
    { label: 'capability', value: demoRun.discovery.requestedCapability },
    { label: 'identity', value: demoRun.discovery.resolvedIdentity },
    { label: 'manifest', value: demoRun.manifest.uri },
    { label: 'peer', value: demoRun.invocation.peer },
    { label: 'trace', value: demoRun.memory.traceUri },
    { label: 'report', value: demoRun.report.reportUri },
  ] as const;

  return (
    <main className={styles.pageShell}>
      <div className={styles.pageFrame}>
        <header className={styles.header}>
          <div className={styles.headerLead}>
            <div className={styles.headerTitles}>
              <h1>OpenTool Mesh</h1>
            </div>
            <p className={styles.kicker}>Decentralized tool discovery, invocation, and execution memory</p>
          </div>

          <div className={styles.headerCenter}>
            <strong className={styles.runTitle}>Solidity Audit Run #{demoRun.runId}</strong>
            <span className={styles.runIdBadge}>{demoRun.contractReference}</span>
          </div>

          <div className={styles.headerStatus}>
            {demoRun.headerStatus.map((chip) => (
              <StatusChip key={chip.label} tone={chip.tone}>
                {chip.label}
              </StatusChip>
            ))}
            <div className={styles.environmentPill}>{demoRun.environment}</div>
          </div>
        </header>

        <div className={styles.contentLayout}>
          <aside className={styles.rail}>
            <ol className={styles.stepList}>
              {lifecycleSteps.map((step, index) => {
                const state = demoRun.lifecycleState[step];
                return (
                  <li key={step} className={styles.stepItem}>
                    <div className={`${styles.stepDot} ${styles[`stepDot${state}`]}`} />
                    {index < lifecycleSteps.length - 1 ? <div className={styles.stepConnector} /> : null}
                    <div className={styles.stepContent}>
                      <span className={styles.stepName}>{step}</span>
                      <span className={styles.stepDetail}>{demoRun.stepDetails[step]}</span>
                    </div>
                  </li>
                );
              })}
            </ol>

            <div className={styles.railLegend}>
              {lifecycleLegend.map((item) => (
                <div key={item} className={styles.legendItem}>
                  <span className={styles.legendBar} />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </aside>

          <section className={styles.mainPanel}>
            <section className={styles.operatorDeck}>
              <div className={styles.operatorHeader}>
                <div>
                  <h2>Demo Flow</h2>
                  <p>
                    Follow this path during the live demo: submit a contract, let the agent discover a tool,
                    verify the manifest, run the remote scanner, then inspect the stored evidence.
                  </p>
                </div>
                <div className={styles.operatorStatus}>
                  <span>Current run</span>
                  <strong>{demoRun.runId}</strong>
                </div>
              </div>

              <div className={styles.flowGrid}>
                {demoFlow.map((step) => (
                  <article key={step.number} className={styles.flowStep}>
                    <span className={styles.flowNumber}>{step.number}</span>
                    <h3>{step.title}</h3>
                    <strong>{step.detail}</strong>
                    <p>{step.meta}</p>
                  </article>
                ))}
              </div>
            </section>

            <section className={styles.usageGrid}>
              <div className={styles.usagePanel}>
                <div className={styles.panelHeader}>
                  <span className={styles.reportEyebrow}>Tool Usage</span>
                  <h2>How the demo is operated</h2>
                </div>
                <div className={styles.commandList}>
                  {usageCommands.map((item) => (
                    <div key={item.label} className={styles.commandRow}>
                      <span>{item.label}</span>
                      <code>{item.command}</code>
                      <p>{item.result}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className={styles.evidencePanel}>
                <div className={styles.panelHeader}>
                  <span className={styles.reportEyebrow}>Live Run Evidence</span>
                  <h2>What to point at on screen</h2>
                </div>
                <div className={styles.evidenceList}>
                  {evidenceRows.map((item) => (
                    <InfoRow key={item.label} label={item.label} value={item.value} mono />
                  ))}
                </div>
              </div>
            </section>

            <div className={styles.cardGrid}>
              <SectionCard
                title="Discovery"
                eyebrow="ENS • 0G KV"
                accent="cyan"
                footer={<StatusChip tone="outline">Discovery starts from capability</StatusChip>}
              >
                <div className={styles.discoveryFlow}>
                  <div className={styles.discoveryNode}>
                    <span className={styles.discoveryLabel}>Capability Query</span>
                    <strong>{demoRun.discovery.requestedCapability}</strong>
                  </div>
                  <TraceLine label="ENS" />
                  <div className={styles.discoveryNode}>
                    <span className={styles.discoveryLabel}>resolved identity</span>
                    <strong>{demoRun.discovery.resolvedIdentity}</strong>
                  </div>
                </div>
                <p className={styles.cardIntro}>Discovery starts from capability, not a baked-in endpoint.</p>
                <div className={styles.discoveryList}>
                  <InfoRow label="requested capability" value={demoRun.discovery.requestedCapability} mono />
                  <InfoRow label="candidate count" value={demoRun.discovery.candidateCount} />
                  <InfoRow label="resolved identity" value={demoRun.discovery.resolvedIdentity} mono />
                  <InfoRow label="ens name" value={demoRun.discovery.ensName} mono />
                  <InfoRow label="selected reason" value={demoRun.discovery.selectedReason} />
                  <InfoRow label="not hardcoded" value={demoRun.discovery.notHardcoded} status="success" />
                </div>
                <div className={styles.cardNote}>Candidate list came from capability index.</div>
              </SectionCard>

              <SectionCard
                title="Manifest"
                eyebrow="MCP-compatible manifest • 0G Storage"
                accent="teal"
                footer={<StatusChip tone="success">Verified before call</StatusChip>}
              >
                <p className={styles.cardIntro}>OpenTool Mesh verifies schema, owner, hash, and version before call.</p>
                <div className={styles.cardStack}>
                  <InfoRow label="manifest URI" value={demoRun.manifest.uri} mono />
                  <InfoRow label="manifest hash" value={demoRun.manifest.hash} mono />
                  <InfoRow label="owner" value={demoRun.manifest.owner} mono />
                  <InfoRow label="version" value={demoRun.manifest.version} mono />
                  <InfoRow label="schema status" value={demoRun.manifest.schemaStatus} status="success" />
                  <InfoRow label="sdk version range" value={demoRun.manifest.sdkVersionRange} mono />
                  <InfoRow label="owner valid" value={demoRun.manifest.ownerValid} status="success" />
                  <InfoRow label="version compatible" value={demoRun.manifest.versionCompatible} status="success" />
                </div>
                <div className={styles.hashBlock}>
                  <span className={styles.hashLabel}>Manifest Hash</span>
                  <HashPill>{demoRun.manifest.hash}</HashPill>
                </div>
              </SectionCard>

              <SectionCard
                title="Invocation"
                eyebrow="AXL"
                accent="cyan"
                footer={<StatusChip tone="success">External node</StatusChip>}
              >
                <p className={styles.cardIntro}>Invocation crosses node boundaries; the tool is not an internal function.</p>
                <div className={styles.agentBridge}>
                  <div className={styles.bridgeNode}>
                    <span className={styles.discoveryLabel}>Audit Agent</span>
                    <strong>{demoRun.invocation.agent}</strong>
                  </div>
                  <TraceLine label="AXL request / response" direction="bidirectional" />
                  <div className={styles.bridgeNode}>
                    <span className={styles.discoveryLabel}>Remote Tool Node</span>
                    <strong>{demoRun.invocation.remoteNode}</strong>
                  </div>
                </div>
                <div className={styles.cardStack}>
                  <InfoRow label="transport" value={demoRun.invocation.transport} mono />
                  <InfoRow label="AXL peer" value={demoRun.invocation.peer} mono />
                  <InfoRow label="method" value={demoRun.invocation.method} mono />
                  <InfoRow label="tool call status" value={demoRun.invocation.status} status="success" />
                  <InfoRow label="request URI" value={demoRun.invocation.requestUri} mono />
                  <InfoRow label="response summary" value={demoRun.invocation.responseSummary} />
                </div>
                <div className={styles.payloadChip}>Payload: source -&gt; findings</div>
              </SectionCard>

              <SectionCard
                title="Memory"
                eyebrow="0G Storage"
                accent="teal"
                footer={<StatusChip tone="success">Trace persisted</StatusChip>}
              >
                <p className={styles.cardIntro}>Every call leaves verifiable memory: which tool, which manifest, which input, which output.</p>
                <div className={styles.memoryStorage}>
                  <div className={styles.storageBadge}>0G</div>
                  <div className={styles.storageText}>
                    <strong>{demoRun.memory.traceUri}</strong>
                    <span>Every call leaves verifiable memory: which tool, which manifest, which input, which output.</span>
                  </div>
                </div>
                <div className={styles.cardStack}>
                  <InfoRow label="trace id" value={demoRun.memory.traceId} mono />
                  <InfoRow label="input hash" value={demoRun.memory.inputHash} mono />
                  <InfoRow label="output hash" value={demoRun.memory.outputHash} mono />
                  <InfoRow label="trace URI" value={demoRun.memory.traceUri} mono />
                  <InfoRow label="artifact" value={demoRun.memory.artifact} mono />
                  <InfoRow label="persisted at" value={demoRun.memory.persistedAt} mono />
                  <InfoRow label="backend" value={demoRun.memory.backend} status="success" />
                </div>
              </SectionCard>
            </div>

            <section className={styles.reportStrip}>
              <div className={styles.reportHeader}>
                <div>
                  <span className={styles.reportEyebrow}>Outcome</span>
                  <h2>Final Audit Report</h2>
                  <p className={styles.reportLead}>Synthesis of discovery, manifest verification, invocation, and memory trace.</p>
                </div>
                <div className={styles.severityRow}>
                  {demoRun.report.severity.map((severity) => (
                    <SeverityBadge
                      key={severity.label}
                      label={severity.label}
                      value={severity.value}
                      tone={severity.tone}
                    />
                  ))}
                </div>
              </div>

              <div className={styles.reportBody}>
                <div className={styles.reportSummary}>
                  <p>{demoRun.report.summaryText}</p>
                  <div className={styles.reportCallout}>
                    <span className={styles.reportCalloutLabel}>Top Finding</span>
                    <strong>{demoRun.report.title}</strong>
                  </div>
                  {secondaryIssue ? <p className={styles.issueLine}>{secondaryIssue}</p> : null}
                </div>
                <div className={styles.reportMeta}>
                  <InfoRow label="trace id" value={demoRun.report.traceReference} mono />
                  <InfoRow label="tool reference" value={demoRun.report.toolReference} mono />
                  <InfoRow label="report URI" value={demoRun.report.reportUri} mono />
                </div>
              </div>
            </section>
          </section>
        </div>
      </div>
    </main>
  );
}
