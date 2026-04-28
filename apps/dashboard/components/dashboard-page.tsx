import { demoRun } from '../lib/demo-run';
import { HashPill } from './hash-pill';
import { InfoRow } from './info-row';
import { SectionCard } from './section-card';
import { SeverityBadge } from './severity-badge';
import { StatusChip } from './status-chip';
import { TraceLine } from './trace-line';
import styles from './dashboard-page.module.css';

const lifecycleSteps = ['Publish', 'Discover', 'Verify', 'Call', 'Trace', 'Report'] as const;

export function DashboardPage() {
  return (
    <main className={styles.pageShell}>
      <div className={styles.pageFrame}>
        <header className={styles.header}>
          <div>
            <p className={styles.kicker}>Decentralized Tool Discovery + Execution Memory</p>
            <div className={styles.headerTitles}>
              <h1>OpenTool Mesh</h1>
              <span className={styles.runTitle}>Solidity Audit Run</span>
            </div>
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
            <div className={styles.railHeader}>
              <span className={styles.railLabel}>Run Lifecycle</span>
              <span className={styles.railId}>Run #{demoRun.runId}</span>
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
                    <span className={styles.discoveryLabel}>Requested capability</span>
                    <strong>{demoRun.discovery.requestedCapability}</strong>
                  </div>
                  <TraceLine label="0G capability index + ENS resolution" />
                  <div className={styles.discoveryNode}>
                    <span className={styles.discoveryLabel}>Resolved identity</span>
                    <strong>{demoRun.discovery.resolvedIdentity}</strong>
                  </div>
                </div>
                <div className={styles.discoveryList}>
                  <InfoRow label="Resolved tool identity" value={demoRun.discovery.resolvedIdentity} mono />
                  <InfoRow label="Primary tool" value={demoRun.discovery.tool} />
                  <InfoRow label="Capability index" value={demoRun.discovery.capabilityIndex} mono />
                  <InfoRow label="Capability matches" value={demoRun.discovery.capabilityMatches} />
                  <InfoRow label="Selected reason" value={demoRun.discovery.selectedReason} />
                  <InfoRow label="Resolved at" value={demoRun.discovery.resolvedAt} mono />
                  <InfoRow label="Invocation mode" value={demoRun.discovery.invocationMode} />
                </div>
              </SectionCard>

              <SectionCard
                title="Manifest"
                eyebrow="Verification Boundary"
                accent="teal"
                footer={<StatusChip tone="success">Trust checks passed</StatusChip>}
              >
                <div className={styles.cardStack}>
                  <InfoRow label="Manifest URI" value={demoRun.manifest.uri} mono />
                  <InfoRow label="Version" value={demoRun.manifest.version} mono />
                  <InfoRow label="Owner" value={demoRun.manifest.owner} mono />
                  <InfoRow label="Verification" value={demoRun.manifest.verificationOutcome} status="success" />
                  <InfoRow label="Manifest hash check" value={demoRun.manifest.hashStatus} status="success" />
                  <InfoRow label="Schema" value={demoRun.manifest.schemaStatus} status="success" />
                  <InfoRow label="Version range" value={demoRun.manifest.compatibility} status="success" />
                  <InfoRow label="SDK compatibility" value={demoRun.manifest.versionStatus} status="success" />
                  <InfoRow label="Verified at" value={demoRun.manifest.verifiedAt} mono />
                  <div className={styles.hashBlock}>
                    <span className={styles.hashLabel}>Manifest hash</span>
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
                  <InfoRow label="AXL peer" value={demoRun.invocation.peer} mono />
                  <InfoRow label="Tool call" value={demoRun.invocation.status} status="success" />
                  <InfoRow label="Started at" value={demoRun.invocation.startedAt} mono />
                  <InfoRow label="Finished at" value={demoRun.invocation.finishedAt} mono />
                  <InfoRow label="Request payload" value={demoRun.invocation.requestSummary} />
                  <InfoRow label="Response summary" value={demoRun.invocation.responseSummary} />
                  <div className={styles.findingsBadge}>{demoRun.invocation.findingsBadge}</div>
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
                    <span>Execution trace, artifacts, and report references stored with verifiable provenance.</span>
                  </div>
                </div>
                <div className={styles.cardStack}>
                  <InfoRow label="Input hash" value={demoRun.memory.inputHash} mono />
                  <InfoRow label="Output hash" value={demoRun.memory.outputHash} mono />
                  <InfoRow label="Artifact ref" value={demoRun.memory.artifactReference} mono />
                  <InfoRow label="Artifact hash" value={demoRun.memory.artifactHash} mono />
                  <InfoRow label="Report ref" value={demoRun.memory.reportReference} mono />
                  <InfoRow label="Report hash" value={demoRun.memory.reportHash} mono />
                  <InfoRow label="Persisted at" value={demoRun.memory.persistedAt} mono />
                  <InfoRow label="Trace status" value={demoRun.memory.traceStatus} status="success" />
                </div>
              </SectionCard>
            </div>

            <section className={styles.reportStrip}>
              <div className={styles.reportHeader}>
                <div>
                  <span className={styles.reportEyebrow}>Outcome</span>
                  <h2>Final audit report</h2>
                </div>
                <div className={styles.reportMetrics}>
                  <div className={styles.metricBox}>
                    <span>Findings</span>
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
                  <InfoRow label="Report ID" value={demoRun.report.reportId} mono />
                  <InfoRow label="Report URI" value={demoRun.report.reportUri} mono />
                  <InfoRow label="Trace ID" value={demoRun.report.traceReference} mono />
                  <InfoRow label="Generated at" value={demoRun.report.generatedAt} mono />
                  <InfoRow label="Manifest version" value={demoRun.report.manifestVersion} mono />
                  <InfoRow label="Requested capability" value={demoRun.discovery.requestedCapability} />
                  <InfoRow label="Resolved tool identity" value={demoRun.discovery.resolvedIdentity} mono />
                  <InfoRow label="AXL peer" value={demoRun.invocation.peer} mono />
                </div>
              </div>
            </section>
          </section>
        </div>
      </div>
    </main>
  );
}
