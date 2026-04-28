export function createSolidityScanner() {
  return async function scanSoliditySource(source: string) {
    const findings = [];

    if (source.includes(".call{value:")) {
      findings.push({
        ruleId: "reentrancy-call-before-state",
        severity: "high",
        title: "Unchecked external call can enable reentrancy",
        message: "External value transfer detected. Review state updates and reentrancy protection.",
        location: {
          file: "contract.sol",
          lineStart: 1
        }
      });
    }

    if (/owner/i.test(source) && !/event\s+\w+/i.test(source)) {
      findings.push({
        ruleId: "missing-admin-event",
        severity: "low",
        title: "Administrative path lacks event emission",
        message: "Owner-controlled actions should emit events for auditability.",
        location: {
          file: "contract.sol",
          lineStart: 1
        }
      });
    }

    if (/pause|paused/i.test(source) && !/require\s*\(!?paused/i.test(source)) {
      findings.push({
        ruleId: "missing-paused-guard-test",
        severity: "medium",
        title: "Pause flow lacks obvious negative-path assertion",
        message: "Consider adding paused-state transfer checks or follow-up tests.",
        location: {
          file: "contract.sol",
          lineStart: 1
        }
      });
    }

    return {
      findings,
      summary: {
        totalFindings: findings.length,
        critical: findings.filter((finding) => finding.severity === "critical").length,
        high: findings.filter((finding) => finding.severity === "high").length,
        medium: findings.filter((finding) => finding.severity === "medium").length,
        low: findings.filter((finding) => finding.severity === "low").length
      },
      sourceLength: source.length
    };
  };
}
