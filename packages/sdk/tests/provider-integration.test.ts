import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ToolManifest } from "@opentoolmesh/shared";
import {
  createProviderClientDeps,
  createProviderConfigFromEnv,
  createLocalDevnetPaths,
  createOpenToolMeshClient,
  hashManifest,
  seedPeerRegistry
} from "../src/index.js";
import { createLocalInvocationTransport } from "../src/client/local-devnet.js";
import { createGensynAxlInvocationTransport } from "../src/client/providers/gensyn-axl.js";

const ownerAddress = "0x1111111111111111111111111111111111111111";
const kvStreamId = "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";

function buildManifest(): ToolManifest {
  const manifest: ToolManifest = {
    schemaVersion: "otm.manifest.v1",
    toolId: "otm:ens:provider-test.tool.eth",
    name: "Provider Test Tool",
    version: "0.1.0",
    description: "Fixture for provider integration seam tests.",
    owner: {
      ensName: "provider-test.tool.eth",
      address: ownerAddress
    },
    capabilities: [
      {
        id: "provider-test-capability",
        description: "Provider seam fixture capability"
      }
    ],
    mcp: {
      toolName: "provider_test",
      protocol: "mcp-compatible",
      inputSchema: {
        type: "object"
      },
      outputSchema: {
        type: "object"
      }
    },
    invocation: {
      transport: "axl",
      axlPeerId: "peer-provider-test",
      axlMethod: "invokeTool",
      timeoutMs: 2500
    },
    storage: {
      manifestUri: "",
      traceNamespace: "traces"
    },
    compatibility: {
      sdkVersionRange: "^0.1.0",
      manifestApiVersion: "v1"
    },
    integrity: {
      manifestHash: "",
      createdAt: "2026-04-30T00:00:00.000Z"
    }
  };

  manifest.integrity.manifestHash = hashManifest(manifest);
  return manifest;
}

async function createTempRoot() {
  return mkdtemp(join(tmpdir(), "otm-provider-test-"));
}

describe("provider integration seams", () => {
  let tempRoots: string[] = [];

  beforeEach(() => {
    tempRoots = [];
  });

  afterEach(async () => {
    vi.unstubAllGlobals();
    await Promise.all(tempRoots.map((root) => rm(root, { recursive: true, force: true })));
  });

  async function trackTempRoot() {
    const root = await createTempRoot();
    tempRoots.push(root);
    return root;
  }

  it("parses the default local provider profile under the workspace state directory", async () => {
    const root = await trackTempRoot();

    const config = createProviderConfigFromEnv({}, root);

    expect(config).toEqual({
      profile: "local",
      rootDir: root
    });
    expect(createLocalDevnetPaths(root)).toEqual({
      rootDir: root,
      stateDir: join(root, ".opentoolmesh"),
      storageDir: join(root, ".opentoolmesh", "storage"),
      kvDir: join(root, ".opentoolmesh", "kv"),
      ensFile: join(root, ".opentoolmesh", "ens-records.json"),
      peersFile: join(root, ".opentoolmesh", "axl-peers.json")
    });
  });

  it("parses provider-testnet configuration without normalizing away provider fields", async () => {
    const config = createProviderConfigFromEnv(
      {
        OTM_PROVIDER_PROFILE: " provider-testnet ",
        OTM_ENS_PROVIDER: "ens",
        OTM_ENS_RPC_URL: " https://ethereum-testnet.example ",
        OTM_ENS_NAME: " provider-test.tool.eth ",
        OTM_ENS_PUBLISHER_PRIVATE_KEY: " 0xabc123 ",
        OTM_STORAGE_PROVIDER: "0g",
        OTM_0G_RPC_URL: " https://0g-evm.example ",
        OTM_0G_INDEXER_URL: " https://0g-indexer.example ",
        OTM_0G_PRIVATE_KEY: " 0xdef456 ",
        OTM_0G_KV_NODE_URL: " https://0g-kv.example ",
        OTM_0G_KV_STREAM_ID: ` ${kvStreamId} `,
        OTM_GENSYN_AXL_ENDPOINT_URL: " http://127.0.0.1:9002 "
      },
      "/unused"
    );

    expect(config).toEqual({
      profile: "provider-testnet",
      network: "testnet",
      ens: {
        provider: "ens",
        rpcUrl: "https://ethereum-testnet.example",
        name: "provider-test.tool.eth",
        publisherPrivateKey: "0xabc123"
      },
      zeroG: {
        provider: "0g",
        rpcUrl: "https://0g-evm.example",
        indexerRpcUrl: "https://0g-indexer.example",
        privateKey: "0xdef456",
        kvNodeUrl: "https://0g-kv.example",
        kvStreamId
      },
      gensynAxl: {
        apiUrl: "http://127.0.0.1:9002"
      }
    });
  });

  it("rejects invalid provider profile configuration early", () => {
    expect(() =>
      createProviderConfigFromEnv(
        {
          OTM_PROVIDER_PROFILE: "provider-testnet",
          OTM_ENS_PROVIDER: "local"
        },
        "/unused"
      )
    ).toThrow("Invalid OTM_ENS_PROVIDER: expected ens");

    expect(() =>
      createProviderConfigFromEnv(
        {
          OTM_PROVIDER_PROFILE: "provider-mainnet",
          OTM_ENS_RPC_URL: "https://ethereum.example",
          OTM_STORAGE_PROVIDER: "0g",
          OTM_0G_RPC_URL: "https://0g-evm.example",
          OTM_0G_INDEXER_RPC: "https://0g-indexer.example",
          OTM_0G_PRIVATE_KEY: "not-hex",
          OTM_0G_KV_NODE_URL: "https://0g-kv.example",
          OTM_0G_KV_STREAM_ID: kvStreamId,
          OTM_GENSYN_AXL_API_URL: "http://127.0.0.1:9002"
        },
        "/unused"
      )
    ).toThrow("Invalid OTM_0G_PRIVATE_KEY: expected a hex string");

    expect(() =>
      createProviderConfigFromEnv(
        {
          OTM_PROVIDER_PROFILE: "provider-mainnet",
          OTM_ENS_RPC_URL: "https://ethereum.example",
          OTM_STORAGE_PROVIDER: "0g",
          OTM_0G_RPC_URL: "https://0g-evm.example",
          OTM_0G_INDEXER_RPC: "https://0g-indexer.example",
          OTM_0G_PRIVATE_KEY: "0xdef456",
          OTM_0G_KV_NODE_URL: "https://0g-kv.example",
          OTM_0G_KV_STREAM_ID: "stream-1",
          OTM_GENSYN_AXL_API_URL: "http://127.0.0.1:9002"
        },
        "/unused"
      )
    ).toThrow("Invalid OTM_0G_KV_STREAM_ID: expected a hex string");
  });

  it("builds the local provider profile client dependencies and preserves publish/resolve behavior", async () => {
    const root = await trackTempRoot();
    const config = createProviderConfigFromEnv({ OTM_PROVIDER_PROFILE: "local" }, root);
    const client = createOpenToolMeshClient(createProviderClientDeps(config));
    const manifest = buildManifest();

    const published = await client.publishManifest({ manifest });
    const identity = await client.resolveIdentity({ ensName: "provider-test.tool.eth" });

    expect(published.version).toBe("0.1.0");
    expect(published.manifestUri).toBe("0g://manifests/otm_ens_provider-test.tool.eth-0.1.0.json");
    expect(identity).toMatchObject({
      id: "otm:ens:provider-test.tool.eth",
      ensName: "provider-test.tool.eth",
      ownerAddress,
      latestManifestUri: published.manifestUri,
      latestManifestHash: published.manifestHash,
      latestVersion: "0.1.0",
      capabilities: ["provider-test-capability"]
    });
  });

  it("sends AXL-style invocations to the registered fetch URL with the expected body", async () => {
    const root = await trackTempRoot();
    await seedPeerRegistry(root, {
      "peer-provider-test": "http://127.0.0.1:9002/"
    });
    const transport = createLocalInvocationTransport(createLocalDevnetPaths(root));
    const fetchCalls: Array<[string, RequestInit]> = [];
    const fetchMock = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
      fetchCalls.push([String(url), init ?? {}]);
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    });
    vi.stubGlobal("fetch", fetchMock);

    const response = await transport.invoke("peer-provider-test", "invokeTool", { input: "value" }, 2500);

    expect(response).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchCalls[0]!;
    expect(url).toBe("http://127.0.0.1:9002/invokeTool");
    expect(init).toMatchObject({
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({ input: "value" })
    });
  });

  it("surfaces AXL transport fetch status errors", async () => {
    const root = await trackTempRoot();
    await seedPeerRegistry(root, {
      "peer-provider-test": "http://127.0.0.1:9002"
    });
    const transport = createLocalInvocationTransport(createLocalDevnetPaths(root));
    vi.stubGlobal("fetch", vi.fn(async () => new Response("unavailable", { status: 503 })));

    await expect(transport.invoke("peer-provider-test", "invokeTool", {}, 2500)).rejects.toThrow(
      "Invocation failed with status 503"
    );
  });

  it("sends Gensyn AXL MCP invocations as JSON-RPC calls", async () => {
    const transport = createGensynAxlInvocationTransport({
      baseUrl: "http://127.0.0.1:9002/"
    });
    const payload = {
      kind: "otm.tool.invoke",
      request: {
        requestId: "request-1"
      }
    };
    const axlResult = {
      kind: "otm.tool.result",
      response: {
        status: "ok",
        finishedAt: "2026-04-30T00:00:00.000Z",
        output: {
          ok: true
        }
      }
    };
    const fetchCalls: Array<[string, RequestInit]> = [];
    const fetchMock = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
      fetchCalls.push([String(url), init ?? {}]);
      return new Response(
        JSON.stringify({
          jsonrpc: "2.0",
          id: "response-1",
          result: axlResult
        }),
        { status: 200 }
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    const response = await transport.invoke("peer/provider-test", "invokeTool", payload, 2500);

    expect(response).toEqual(axlResult);
    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchCalls[0]!;
    expect(url).toBe("http://127.0.0.1:9002/mcp/peer%2Fprovider-test/invokeTool");
    expect(init?.method).toBe("POST");
    expect(init?.headers).toEqual({
      "content-type": "application/json"
    });
    const body = JSON.parse(init?.body as string) as {
      jsonrpc: string;
      id: string;
      method: string;
      params: typeof payload;
    };
    expect(body).toMatchObject({
      jsonrpc: "2.0",
      method: "invokeTool",
      params: payload
    });
    expect(typeof body.id).toBe("string");
  });

  it("rejects AXL invocations when the peer is not configured", async () => {
    const root = await trackTempRoot();
    const transport = createLocalInvocationTransport(createLocalDevnetPaths(root));

    await expect(transport.invoke("missing-peer", "invokeTool", {}, 2500)).rejects.toThrow(
      "AXL peer not registered: missing-peer"
    );
  });
});
