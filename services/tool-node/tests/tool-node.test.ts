import { describe, expect, it } from "vitest";
import { invokeToolHandler } from "../src/handlers/invoke-tool.js";
import { createSolidityScanner } from "../src/scanner/solidity-pattern-scanner.js";

describe("tool node scanner", () => {
  it("returns the expected findings for the sample contract shape", async () => {
    const scanner = createSolidityScanner();
    const output = await scanner(`
      contract Vault {
        address public owner;
        bool public paused;

        function withdraw(uint256 amount) external {
          (bool ok, ) = msg.sender.call{value: amount}("");
          require(ok, "transfer failed");
        }
      }
    `);

    expect(output.summary.totalFindings).toBe(3);
    expect(output.summary.high).toBe(1);
    expect(output.summary.medium).toBe(1);
    expect(output.summary.low).toBe(1);
  });

  it("wraps scanner output in the AXL result envelope", async () => {
    const result = await invokeToolHandler(
      {
        kind: "otm.tool.invoke",
        request: {
          requestId: "req_1",
          traceId: "trace_1",
          toolId: "otm:ens:solidity-scanner.auditagent.eth",
          capability: "solidity-static-analysis",
          manifestUri: "0g://manifests/otm_ens_solidity-scanner.auditagent.eth-0.1.0.json",
          manifestHash: "sha256:test",
          caller: { agentId: "demo-agent" },
          input: { source: "contract Vault { address public owner; }" },
          inputHash: "sha256:test-input",
          sentAt: "2026-04-28T00:00:00.000Z"
        }
      },
      createSolidityScanner()
    );

    expect(result.kind).toBe("otm.tool.result");
    expect(result.response.status).toBe("ok");
    expect(result.response.traceId).toBe("trace_1");
    expect(result.response.output?.summary.totalFindings).toBe(1);
  });
});
