import type { CliCommand } from "./types.js";

export const publishCommand: CliCommand = {
  name: "publish",
  description: "Upload a manifest and update the capability index",
  async run(args, context) {
    context.stdout.log("publish command scaffold", { args, cwd: context.cwd });
  }
};

