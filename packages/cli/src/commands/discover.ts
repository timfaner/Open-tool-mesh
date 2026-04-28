import type { CliCommand } from "./types.js";
import { createCliClient, getFlag } from "./helpers.js";

export const discoverCommand: CliCommand = {
  name: "discover",
  description: "Discover tools by capability",
  async run(args, context) {
    const capability = getFlag(args, "--capability");
    const { client } = await createCliClient(context.cwd);
    context.stdout.log(JSON.stringify(await client.discoverTools({ capability }), null, 2));
  }
};
