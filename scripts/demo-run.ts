import { access, rm } from "node:fs/promises";
import { constants as fsConstants } from "node:fs";
import { resolve } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const TOOL_NODE_BASE_URL = process.env.OTM_TOOL_NODE_BASE_URL ?? "http://127.0.0.1:4318";
const TOOL_NODE_HEALTH_URL = new URL("/health", TOOL_NODE_BASE_URL).toString();
const TOOL_NODE_DIST = "services/tool-node/dist/services/tool-node/src/server.js";
const AUDIT_AGENT_DIST = "examples/audit-agent/dist/examples/audit-agent/src/run-audit.js";

async function buildDemoPackages(rootDir: string) {
  await execFileAsync("corepack", ["pnpm", "--filter", "@opentoolmesh/sdk", "build"], { cwd: rootDir });
  await execFileAsync("corepack", ["pnpm", "--filter", "@opentoolmesh/tool-node", "build"], { cwd: rootDir });
  await execFileAsync("corepack", ["pnpm", "--filter", "@opentoolmesh/audit-agent", "build"], { cwd: rootDir });
}

async function hasBuiltArtifact(rootDir: string, relativePath: string) {
  try {
    await access(resolve(rootDir, relativePath), fsConstants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function isToolNodeHealthy() {
  try {
    const response = await fetch(TOOL_NODE_HEALTH_URL, { method: "GET" });

    if (!response.ok) {
      return false;
    }

    const payload = (await response.json()) as { ok?: boolean; capability?: string };
    return payload.ok === true && payload.capability === "solidity-static-analysis";
  } catch {
    return false;
  }
}

async function withToolNode<T>(rootDir: string, run: (managedLocally: boolean) => Promise<T>) {
  if (await isToolNodeHealthy()) {
    return run(false);
  }

  const { createToolNodeServer } = await import(`../${TOOL_NODE_DIST}`);
  const port = Number(new URL(TOOL_NODE_BASE_URL).port || "80");
  const server = createToolNodeServer().listen(port);

  await new Promise<void>((resolveReady, rejectReady) => {
    server.once("listening", () => resolveReady());
    server.once("error", rejectReady);
  });

  try {
    return await run(true);
  } finally {
    await new Promise<void>((resolveClosed, rejectClosed) => {
      server.close((error) => {
        if (error) {
          rejectClosed(error);
          return;
        }
        resolveClosed();
      });
    });
  }
}

async function main() {
  const rootDir = new URL("..", import.meta.url).pathname;
  await buildDemoPackages(rootDir);

  const {
    createLocalDevnetPaths,
    findWorkspaceRoot
  } = await import("../packages/sdk/dist/sdk/src/index.js");
  const workspaceRoot = await findWorkspaceRoot(rootDir);
  const paths = createLocalDevnetPaths(workspaceRoot);

  await rm(paths.stateDir, { recursive: true, force: true });

  const [toolNodeBuilt, auditAgentBuilt] = await Promise.all([
    hasBuiltArtifact(workspaceRoot, TOOL_NODE_DIST),
    hasBuiltArtifact(workspaceRoot, AUDIT_AGENT_DIST)
  ]);

  if (!toolNodeBuilt || !auditAgentBuilt) {
    throw new Error("demo build artifacts missing after build step");
  }

  const { publishDemoTool } = await import("./publish-tool.ts");
  const { runAuditDemo } = await import(`../${AUDIT_AGENT_DIST}`);

  const result = await withToolNode(workspaceRoot, async (managedLocally) => {
    const publish = await publishDemoTool();
    const audit = await runAuditDemo();

    return {
      toolNode: {
        baseUrl: TOOL_NODE_BASE_URL,
        healthUrl: TOOL_NODE_HEALTH_URL,
        mode: managedLocally ? "managed-by-demo-run" : "reused-existing-process"
      },
      publish,
      discover: [
        {
          id: audit.tool.id,
          ensName: audit.tool.ensName,
          ownerAddress: audit.tool.ownerAddress,
          latestManifestUri: audit.tool.latestManifestUri,
          latestManifestHash: audit.tool.latestManifestHash,
          latestVersion: audit.tool.latestVersion,
          capabilities: audit.tool.capabilities,
          manifestUri: audit.tool.latestManifestUri,
          manifestHash: audit.tool.latestManifestHash
        }
      ],
      resolve: audit.tool,
      verify: audit.verification,
      call: {
        traceId: audit.traceId,
        status: audit.response.status,
        output: audit.response.output
      },
      trace: {
        traceId: audit.traceId,
        traceUri: audit.traceUri
      },
      report: {
        reportId: audit.report.reportId,
        reportUri: audit.reportUri
      },
      files: {
        ensRecords: paths.ensFile,
        peerRegistry: paths.peersFile,
        trace: resolve(paths.storageDir, "traces", `${audit.traceId}.json`),
        artifact: resolve(paths.storageDir, "artifacts", `${audit.traceId}.json`),
        report: resolve(paths.storageDir, "reports", `${audit.report.reportId}.json`)
      }
    };
  });

  console.log(JSON.stringify(result, null, 2));
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
