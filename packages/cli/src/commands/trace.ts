import type { CliCommand } from "./types.js";
import { getFlag, readStoredTrace } from "./helpers.js";

export const traceCommand: CliCommand = {
  name: "trace",
  description: "Fetch an execution trace summary",
  async run(args, context) {
    const traceId = getFlag(args, "--trace");
    const trace = await readStoredTrace(context.cwd, traceId);
    context.stdout.log(JSON.stringify(trace, null, 2));
  }
};
