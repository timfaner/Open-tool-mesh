import type { DashboardRun } from '../lib/demo-run';
import { HashPill } from './hash-pill';
import { InfoRow } from './info-row';
import { SectionCard } from './section-card';
import { SeverityBadge } from './severity-badge';
import { StatusChip } from './status-chip';
import { TraceLine } from './trace-line';
import styles from './dashboard-page.module.css';

const lifecycleSteps = ['Publish', 'Discover', 'Verify', 'Call', 'Trace', 'Report'] as const;
const narrativeSteps = [
  ['Discovery', 'Find the right tool by capability, not a hardcoded endpoint.'],
  ['Manifest', 'Verify owner, hash, version, and schema before execution.'],
  ['Invocation', 'Call an external tool node over the AXL transport boundary.'],
  ['Memory', 'Persist request, response, trace, and final report into 0G-backed storage.'],
] as const;

export function DashboardPage({ demoRun }: { demoRun: DashboardRun }) {
  return (
    <main className={styles.pageShell}>
      <div className={styles.pageFrame}>
        <header className={styles.header}>
          <div className={styles.headerLead}>
            <p className={styles.kicker}>Decentralized tool discovery, invocation, and execution memory</p>
            <div className={styles.headerTitles}>
              <h1>OpenTool Mesh</h1>
            </div>
            <p className={styles.headerSummary}>One verifiable Solidity audit run, compressed into the four acceptance layers: Discovery, Manifest, Invocation, and Memory.</p>
          </div>

          <div className={styles.headerCenter}>
            <span className={styles.centerLabel}>Run Focus</span>
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

        <section className={styles.narrativeStrip}>
          {narrativeSteps.map(([label, copy]) => (
            <div key={label} className={styles.narrativeCard}>
              <span className={styles.narrativeLabel}>{label}</span>
              <p>{copy}</p>
            </div>
          ))}
        </section>

        <div className={styles.contentLayout}>
          <aside className={styles.rail}>
            <div className={styles.railHeader}>
              <span className={styles.railLabel}>Run Lifecycle</span>
              <span className={styles.railId}>{demoRun.discovery.requestedCapability}</span>
            </div>

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

            <div className={styles.discoveryList}>
              <InfoRow
                label="data source"
                value={demoRun.source === 'runtime' ? 'latest successful demo:run' : 'fixture fallback baseline'}
              />
            </div>
          </aside>

          <section className={styles.mainPanel}>
            <div className={styles.cardGrid}>
              <SectionCard
                title="Discovery"
                eyebrow="Capability Resolution"
                accent="cyan"
                footer={<StatusChip tone="outline">Not hardcoded</StatusChip>}
              >
                <div className={styles.discoveryFlow}>
                  <div className={styles.discoveryNode}>
                    <span className={styles.discoveryLabel}>publish proof</span>
                    <strong>{demoRun.publish.ensName}</strong>
                  </div>
                  <TraceLine label="ENS + capability index" />
                  <div className={styles.discoveryNode}>
                    <span className={styles.discoveryLabel}>resolved identity</span>
                    <strong>{demoRun.discovery.resolvedIdentity}</strong>
                  </div>
                </div>
                <div className={styles.discoveryList}>
                  <InfoRow label="ENS name" value={demoRun.publish.ensName} mono />
                  <InfoRow label="manifest URI" value={demoRun.publish.manifestUri} mono />
                  <InfoRow label="manifest hash" value={demoRun.publish.manifestHash} mono />
                  <InfoRow label="capability index" value={demoRun.publish.capabilityIndex} mono />
                  <InfoRow label="owner" value={demoRun.publish.owner} mono />
                  <InfoRow label="requested capability" value={demoRun.discovery.requestedCapability} mono />
                  <InfoRow label="candidate count" value={demoRun.discovery.candidateCount} />
                  <InfoRow label="resolved identity" value={demoRun.discovery.resolvedIdentity} mono />
                  <InfoRow label="ens name" value={demoRun.discovery.ensName} mono />
                  <InfoRow label="selected reason" value={demoRun.discovery.selectedReason} />
                  <InfoRow label="not hardcoded" value={demoRun.discovery.notHardcoded} status="success" />
                  <InfoRow label="capability index" value={demoRun.discovery.capabilityIndex} mono />
                  <InfoRow label="resolved at" value={demoRun.discovery.resolvedAt} mono />
                </div>
              </SectionCard>

              <SectionCard
                title="Manifest"
                eyebrow="Verification Boundary"
                accent="teal"
                footer={<StatusChip tone="success">Trust checks passed</StatusChip>}
              >
                <div className={styles.cardStack}>
                  <InfoRow label="manifest URI" value={demoRun.manifest.uri} mono />
                  <InfoRow label="version" value={demoRun.manifest.version} mono />
                  <InfoRow label="owner" value={demoRun.manifest.owner} mono />
                  <InfoRow label="schema status" value={demoRun.manifest.schemaStatus} status="success" />
                  <InfoRow label="sdk version range" value={demoRun.manifest.sdkVersionRange} mono />
                  <InfoRow label="owner valid" value={demoRun.manifest.ownerValid} status="success" />
                  <InfoRow label="version compatible" value={demoRun.manifest.versionCompatible} status="success" />
                  <div className={styles.hashBlock}>
                    <span className={styles.hashLabel}>manifest hash</span>
                    <HashPill>{demoRun.manifest.hash}</HashPill>
                  </div>
                </div>
              </SectionCard>

              <SectionCard
                title="Invocation"
                eyebrow="Remote AXL Execution"
                accent="cyan"
                footer={<StatusChip tone="success">External tool node</StatusChip>}
              >
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
                  <InfoRow label="response URI" value={demoRun.invocation.responseUri} mono />
                  <InfoRow label="request summary" value={demoRun.invocation.requestSummary} />
                  <InfoRow label="response summary" value={demoRun.invocation.responseSummary} />
                  <InfoRow label="started at" value={demoRun.invocation.startedAt} mono />
                  <InfoRow label="finished at" value={demoRun.invocation.finishedAt} mono />
                </div>
              </SectionCard>

              <SectionCard
                title="Memory"
                eyebrow="0G Provenance"
                accent="teal"
                footer={<StatusChip tone="success">Trace persisted</StatusChip>}
              >
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
                  <InfoRow label="request URI" value={demoRun.memory.requestUri} mono />
                  <InfoRow label="response URI" value={demoRun.memory.responseUri} mono />
                  <InfoRow label="trace URI" value={demoRun.memory.traceUri} mono />
                  <InfoRow label="artifact" value={demoRun.memory.artifact} mono />
                  <InfoRow label="report URI" value={demoRun.memory.reportUri} mono />
                  <InfoRow label="persisted at" value={demoRun.memory.persistedAt} mono />
                  <InfoRow label="backend" value={demoRun.memory.backend} status="success" />
                </div>
              </SectionCard>
            </div>

            <section className={styles.reportStrip}>
              <div className={styles.reportHeader}>
                <div>
                  <span className={styles.reportEyebrow}>Outcome</span>
                  <h2>Final Report</h2>
                </div>
                <div className={styles.reportMetrics}>
                  <div className={styles.metricBox}>
                    <span>findings</span>
                    <strong>{demoRun.report.findings}</strong>
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
              </div>

              <div className={styles.reportBody}>
                <div className={styles.reportSummary}>
                  <div className={styles.reportCallout}>
                    <span className={styles.reportCalloutLabel}>Top issue</span>
                    <strong>{demoRun.report.title}</strong>
                  </div>
                  <p>{demoRun.report.summaryText}</p>
                  {demoRun.report.summary.map((item) => (
                    <p key={item}>{item}</p>
                  ))}
                </div>
                <div className={styles.reportMeta}>
                  <InfoRow label="report ID" value={demoRun.report.reportId} mono />
                  <InfoRow label="report URI" value={demoRun.report.reportUri} mono />
                  <InfoRow label="trace id" value={demoRun.report.traceReference} mono />
                  <InfoRow label="generated at" value={demoRun.report.generatedAt} mono />
                  <InfoRow label="tool reference" value={demoRun.report.toolReference} mono />
                </div>
              </div>
            </section>
          </section>
        </div>
      </div>
    </main>
  );
}
