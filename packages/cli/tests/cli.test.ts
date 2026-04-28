import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("cli skeleton", () => {
  it("registers the trace command in the entrypoint", () => {
    const source = readFileSync(new URL("../src/index.ts", import.meta.url), "utf8");
    expect(source).toContain("trace");
  });
});

