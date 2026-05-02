import { defineConfig } from "vitest/config";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@opentoolmesh/shared": resolve(rootDir, "packages/shared/src/index.ts"),
      "@opentoolmesh/sdk": resolve(rootDir, "packages/sdk/src/index.ts"),
      "@opentoolmesh/mcp-server": resolve(rootDir, "packages/mcp-server/src/index.ts")
    }
  },
  test: {
    environment: "node"
  }
});
