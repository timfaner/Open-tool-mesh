import { afterEach, describe, expect, it } from "vitest";
import { createToolNodeServer } from "../src/server.js";

const servers: Array<ReturnType<ReturnType<typeof createToolNodeServer>["listen"]>> = [];

afterEach(async () => {
  await Promise.all(
    servers.splice(0).map(
      (server) =>
        new Promise<void>((resolve, reject) => {
          server.close((error) => {
            if (error) {
              reject(error);
              return;
            }
            resolve();
          });
        })
    )
  );
});

describe("tool node server", () => {
  it("exposes a health endpoint for demo orchestration", async () => {
    const server = createToolNodeServer().listen(0);
    servers.push(server);

    await new Promise<void>((resolve) => server.once("listening", resolve));
    const address = server.address();

    if (!address || typeof address !== "object") {
      throw new Error("Expected server address to be available");
    }

    const response = await fetch(`http://127.0.0.1:${address.port}/health`);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      capability: "solidity-static-analysis"
    });
  });
});
