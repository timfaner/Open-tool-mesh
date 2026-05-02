export type AgentInstallTarget =
  | "codex"
  | "claude-code"
  | "cursor"
  | "docker"
  | "openclaw"
  | "hermes";

export interface AgentInstallTemplateOptions {
  target: AgentInstallTarget;
  remoteUrl?: string;
  packageName?: string;
  dockerImage?: string;
}

export interface AgentInstallTemplate {
  target: AgentInstallTarget;
  filename: string;
  description: string;
  content: string;
}

const DEFAULT_PACKAGE_NAME = "@opentoolmesh/mcp-server";
const DEFAULT_DOCKER_IMAGE = "ghcr.io/opentoolmesh/mcp-server:latest";

export const AGENT_INSTALL_TARGETS: AgentInstallTarget[] = [
  "codex",
  "claude-code",
  "cursor",
  "docker",
  "openclaw",
  "hermes"
];

export function renderAgentInstallTemplate(
  options: AgentInstallTemplateOptions
): AgentInstallTemplate {
  const packageName = options.packageName ?? DEFAULT_PACKAGE_NAME;
  const dockerImage = options.dockerImage ?? DEFAULT_DOCKER_IMAGE;
  const command = ["npx", "-y", packageName, "--transport", "stdio"];
  const remoteUrl = options.remoteUrl;

  switch (options.target) {
    case "codex":
      return {
        target: options.target,
        filename: "codex-opentoolmesh-mcp.sh",
        description: "Codex CLI MCP registration command.",
        content: remoteUrl
          ? `codex mcp add opentoolmesh --url ${shellQuote(remoteUrl)}\n`
          : `codex mcp add opentoolmesh -- ${command.map(shellQuote).join(" ")}\n`
      };
    case "claude-code":
      return {
        target: options.target,
        filename: "claude-code-opentoolmesh-mcp.sh",
        description: "Claude Code MCP registration command.",
        content: remoteUrl
          ? `claude mcp add --transport http opentoolmesh ${shellQuote(remoteUrl)}\n`
          : `claude mcp add opentoolmesh -- ${command.map(shellQuote).join(" ")}\n`
      };
    case "cursor":
      return {
        target: options.target,
        filename: "cursor-mcp.json",
        description: "Cursor MCP server configuration.",
        content: `${JSON.stringify(
          {
            mcpServers: {
              opentoolmesh: remoteUrl
                ? {
                    url: remoteUrl
                  }
                : {
                    command: command[0],
                    args: command.slice(1)
                  }
            }
          },
          null,
          2
        )}\n`
      };
    case "docker":
      return {
        target: options.target,
        filename: "docker-opentoolmesh-mcp.sh",
        description: "Docker-backed local MCP server command.",
        content: [
          "docker run --rm -i \\",
          "  -e OTM_PROVIDER_PROFILE=${OTM_PROVIDER_PROFILE:-local} \\",
          "  -v \"$PWD:/workspace\" \\",
          `  ${shellQuote(dockerImage)} --transport stdio --workspace-root /workspace`,
          ""
        ].join("\n")
      };
    case "openclaw":
      return {
        target: options.target,
        filename: "openclaw-opentoolmesh.sh",
        description: "OpenClaw adapter install command.",
        content: "openclaw plugins install @opentoolmesh/openclaw-adapter\n"
      };
    case "hermes":
      return {
        target: options.target,
        filename: "hermes-opentoolmesh.sh",
        description: "Hermes skill install command.",
        content: "hermes skills install @opentoolmesh/hermes-adapter/opentool-mesh\n"
      };
  }
}

export function renderAllAgentInstallTemplates(
  options: Omit<AgentInstallTemplateOptions, "target"> = {}
): AgentInstallTemplate[] {
  return AGENT_INSTALL_TARGETS.map((target) =>
    renderAgentInstallTemplate({
      ...options,
      target
    })
  );
}

function shellQuote(value: string): string {
  if (/^[a-zA-Z0-9_./:@=-]+$/.test(value)) {
    return value;
  }

  return `'${value.replaceAll("'", "'\\''")}'`;
}
