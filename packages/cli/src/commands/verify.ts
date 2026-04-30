import { createCliClient, getFlag } from "./helpers.js";
import type { CliCommand } from "./types.js";

export const verifyCommand: CliCommand = {
  name: "verify",
  description: "Verify the latest manifest for a tool identity",
  async run(args, context) {
    const tool = getFlag(args, "--tool");
    const sdkVersion = getFlag(args, "--sdk-version", "0.1.0");
    const { client } = await createCliClient(context.cwd);
    const identity = await client.resolveIdentity({ ensName: tool });
    const manifest = await client.loadManifest({ manifestUri: identity.latestManifestUri });
    const verification = await client.verifyManifest({
      identity,
      manifest,
      sdkVersion
    });

    context.stdout.log(
      JSON.stringify(
        {
          ok: verification.ok,
          toolId: identity.id,
          ensName: identity.ensName,
          manifestUri: identity.latestManifestUri,
          manifestHash: identity.latestManifestHash,
          version: identity.latestVersion,
          ownerAddress: identity.ownerAddress,
          checks: verification.checks,
          errors: verification.errors
        },
        null,
        2
      )
    );
  }
};
