import { describe, expect, it } from "vitest";
import { createOpenToolMeshClient } from "../src/index.js";

describe("sdk skeleton", () => {
  it("builds audit reports from the baseline client", async () => {
    const client = createOpenToolMeshClient({
      ens: {
        async resolveTextRecords() {
          return {};
        },
        async resolveOwner() {
          return null;
        }
      },
      blob: {
        async putJson() {
          return { uri: "0g://artifact.json", hash: "sha256:test" };
        },
        async getJson() {
          return {};
        }
      },
      kv: {
        async put() {},
        async get() {
          return null;
        }
      },
      transport: {
        async invoke() {
          return {};
        }
      }
    });

    const report = await client.buildAuditReport({
      summary: "Example report",
      findings: []
    });

    expect(report.summary).toBe("Example report");
  });
});

