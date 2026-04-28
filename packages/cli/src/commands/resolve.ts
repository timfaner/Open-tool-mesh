import type { CliCommand } from "./types.js";

export const resolveCommand: CliCommand = {
  name: "resolve",
  description: "Resolve a tool ENS identity",
  async run(args, context) {
    context.stdout.log("resolve command scaffold", { args, cwd: context.cwd });
  }
};

