import { randomUUID } from "node:crypto";
import type { AxlInvokeEnvelope, AxlResultEnvelope } from "@opentoolmesh/shared";
import { invokeToolHandler } from "./handlers/invoke-tool.js";

export type JsonRpcId = string | number | null;

export interface JsonRpcRequest {
  jsonrpc?: "2.0";
  id?: JsonRpcId;
  method?: string;
  params?: unknown;
}

export interface JsonRpcSuccess<T> {
  jsonrpc: "2.0";
  id: JsonRpcId;
  result: T;
}

export interface JsonRpcFailure {
  jsonrpc: "2.0";
  id: JsonRpcId;
  error: {
    code: number;
    message: string;
    data?: unknown;
  };
}

export type JsonRpcResponse<T> = JsonRpcSuccess<T> | JsonRpcFailure;

export async function mcpBridgeHandler<TOutput>(
  request: unknown,
  execute: (source: string) => Promise<TOutput>
): Promise<JsonRpcResponse<AxlResultEnvelope<TOutput>>> {
  const id = getJsonRpcId(request);

  if (!isRecord(request)) {
    return jsonRpcError(id, -32600, "Invalid JSON-RPC request");
  }

  if (request.jsonrpc !== undefined && request.jsonrpc !== "2.0") {
    return jsonRpcError(id, -32600, "Invalid JSON-RPC version");
  }

  const method = typeof request.method === "string" ? request.method : "invokeTool";
  if (method !== "invokeTool") {
    return jsonRpcError(id, -32601, `Method not found: ${method}`);
  }

  const envelope = normalizeInvokeParams(request.params, id);
  const result = await invokeToolHandler(envelope, execute);

  return {
    jsonrpc: "2.0",
    id,
    result
  };
}

export function parseMcpRoute(pathname: string): { peer: string; service: string } | undefined {
  const match = /^\/mcp\/([^/]+)\/([^/]+)$/.exec(pathname);
  if (!match?.[1] || !match[2]) {
    return undefined;
  }

  return {
    peer: decodeURIComponent(match[1]),
    service: decodeURIComponent(match[2])
  };
}

export function jsonRpcError(id: JsonRpcId, code: number, message: string, data?: unknown): JsonRpcFailure {
  return {
    jsonrpc: "2.0",
    id,
    error: data === undefined ? { code, message } : { code, message, data }
  };
}

function normalizeInvokeParams(params: unknown, rpcId: JsonRpcId): AxlInvokeEnvelope<{ source: string }> {
  if (isAxlInvokeEnvelope(params)) {
    return params;
  }

  const input = normalizeDirectPayload(params);
  const now = new Date().toISOString();
  const requestId = rpcId === null ? randomUUID() : String(rpcId);

  return {
    kind: "otm.tool.invoke",
    request: {
      requestId,
      traceId: requestId,
      toolId: "otm:tool-node:solidity-pattern-scanner",
      capability: "solidity-static-analysis",
      manifestUri: "local://services/tool-node/manifests/solidity-pattern-scanner.manifest.json",
      manifestHash: "sha256:local",
      caller: { agentId: "axl-mcp-bridge" },
      input,
      inputHash: "sha256:unverified",
      sentAt: now
    }
  };
}

function normalizeDirectPayload(params: unknown): { source: string } {
  if (isRecord(params) && isRecord(params.input) && typeof params.input.source === "string") {
    return { source: params.input.source };
  }

  if (isRecord(params) && typeof params.source === "string") {
    return { source: params.source };
  }

  return { source: "" };
}

function isAxlInvokeEnvelope(value: unknown): value is AxlInvokeEnvelope<{ source: string }> {
  return (
    isRecord(value) &&
    value.kind === "otm.tool.invoke" &&
    isRecord(value.request) &&
    isRecord(value.request.input) &&
    typeof value.request.input.source === "string"
  );
}

function getJsonRpcId(request: unknown): JsonRpcId {
  if (!isRecord(request)) {
    return null;
  }

  if (typeof request.id === "string" || typeof request.id === "number" || request.id === null) {
    return request.id;
  }

  return null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
