import type { CliCommand } from "./types.js";

export const discoverCommand: CliCommand = {
  name: "discover",
  description: "Discover tools by capability",
  async run(args, context) {
    context.stdout.log("discover command scaffold", { args, cwd: context.cwd });
  }
};

