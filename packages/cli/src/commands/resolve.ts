import type { CliCommand } from "./types.js";
import { createCliClient, getFlag } from "./helpers.js";

export const resolveCommand: CliCommand = {
  name: "resolve",
  description: "Resolve a tool ENS identity",
  async run(args, context) {
    const tool = getFlag(args, "--tool");
    const { client } = await createCliClient(context.cwd);
    context.stdout.log(JSON.stringify(await client.resolveIdentity({ ensName: tool }), null, 2));
  }
};
