import { describe, expect, it } from "vitest";
import { createOpenToolMeshClient, hashJson } from "../src/index.js";

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
        async getJson<T>() {
          return {} as T;
        }
      },
      kv: {
        async put() {},
        async get() {
          return null;
        }
      },
      transport: {
        async invoke<TReq, TRes>(_peerId: string, _method: string, _payload: TReq, _timeoutMs: number) {
          return {} as TRes;
        }
      }
    });

    const report = await client.buildAuditReport({
      summary: "Example report",
      findings: []
    });

    expect(report.summary).toBe("Example report");
  });

  it("hashes json deterministically", () => {
    expect(hashJson({ b: 1, a: 2 })).toBe(hashJson({ a: 2, b: 1 }));
  });
});
