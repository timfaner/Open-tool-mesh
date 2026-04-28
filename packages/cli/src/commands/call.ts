import type { CliCommand } from "./types.js";

export const callCommand: CliCommand = {
  name: "call",
  description: "Invoke a tool and optionally record a trace",
  async run(args, context) {
    context.stdout.log("call command scaffold", { args, cwd: context.cwd });
  }
};

