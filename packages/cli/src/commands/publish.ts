import type { CliCommand } from "./types.js";
import { publishAndIndexManifest, getFlag } from "./helpers.js";

export const publishCommand: CliCommand = {
  name: "publish",
  description: "Upload a manifest and update the capability index",
  async run(args, context) {
    const manifestPath = getFlag(args, "--manifest");
    const { published, manifest } = await publishAndIndexManifest(context.cwd, manifestPath);
    context.stdout.log(
      JSON.stringify(
        {
          toolId: manifest.toolId,
          manifestUri: published.manifestUri,
          manifestHash: published.manifestHash,
          version: published.version,
          capabilities: manifest.capabilities.map((capability) => capability.id)
        },
        null,
        2
      )
    );
  }
};
