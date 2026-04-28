export function createSolidityScanner() {
  return async function scanSoliditySource(source: string) {
    return {
      findings: [],
      summary: {
        totalFindings: 0,
        critical: 0,
        high: 0,
        medium: 0,
        low: 0
      },
      sourceLength: source.length
    };
  };
}

