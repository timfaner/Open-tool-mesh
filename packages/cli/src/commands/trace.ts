import type { CliCommand } from "./types.js";

export const traceCommand: CliCommand = {
  name: "trace",
  description: "Fetch an execution trace summary",
  async run(args, context) {
    context.stdout.log("trace command scaffold", { args, cwd: context.cwd });
  }
};

