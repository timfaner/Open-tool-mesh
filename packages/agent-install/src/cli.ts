#!/usr/bin/env node
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  AGENT_INSTALL_TARGETS,
  renderAgentInstallTemplate,
  renderAllAgentInstallTemplates,
  type AgentInstallTarget
} from "./templates.js";

interface CliOptions {
  target?: AgentInstallTarget;
  all: boolean;
  outputDir?: string;
  remoteUrl?: string;
}

const options = parseArgs(process.argv.slice(2));
const templates = options.all
  ? renderAllAgentInstallTemplates({ remoteUrl: options.remoteUrl })
  : [
      renderAgentInstallTemplate({
        target: options.target ?? "cursor",
        remoteUrl: options.remoteUrl
      })
    ];

if (options.outputDir) {
  await mkdir(options.outputDir, { recursive: true });
  for (const template of templates) {
    await writeFile(resolve(options.outputDir, template.filename), template.content, "utf8");
  }
  console.log(
    JSON.stringify(
      {
        outputDir: options.outputDir,
        files: templates.map((template) => template.filename)
      },
      null,
      2
    )
  );
} else {
  for (const template of templates) {
    console.log(`# ${template.filename}`);
    console.log(`# ${template.description}`);
    console.log(template.content.trimEnd());
    console.log();
  }
}

function parseArgs(args: string[]): CliOptions {
  const options: CliOptions = {
    all: false
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    const next = args[index + 1];

    switch (arg) {
      case "--target":
        options.target = parseTarget(requireValue(next, "--target"));
        index += 1;
        break;
      case "--all":
        options.all = true;
        break;
      case "--output-dir":
        options.outputDir = requireValue(next, "--output-dir");
        index += 1;
        break;
      case "--remote-url":
        options.remoteUrl = requireValue(next, "--remote-url");
        index += 1;
        break;
      case "--help":
        printHelp();
        process.exit(0);
      default:
        throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return options;
}

function parseTarget(value: string): AgentInstallTarget {
  if ((AGENT_INSTALL_TARGETS as string[]).includes(value)) {
    return value as AgentInstallTarget;
  }

  throw new Error(`Unknown target ${value}. Expected one of: ${AGENT_INSTALL_TARGETS.join(", ")}`);
}

function requireValue(value: string | undefined, flag: string): string {
  if (!value) {
    throw new Error(`${flag} requires a value`);
  }

  return value;
}

function printHelp(): void {
  console.log(`OpenTool Mesh agent install template generator

Usage:
  opentoolmesh-agent-install --target cursor
  opentoolmesh-agent-install --all --output-dir .opentoolmesh-agent-install
  opentoolmesh-agent-install --target codex --remote-url https://example.com/mcp

Targets:
  ${AGENT_INSTALL_TARGETS.join(", ")}
`);
}
