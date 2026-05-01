import type { InvocationTransport } from "../create-client.js";

export interface GensynAxlInvocationTransportConfig {
  baseUrl: string;
  headers?: Record<string, string>;
}

interface JsonRpcSuccess<T> {
  jsonrpc: "2.0";
  id: string;
  result: T;
}

interface JsonRpcFailure {
  jsonrpc: "2.0";
  id: string | null;
  error: {
    code?: number;
    message?: string;
    data?: unknown;
  };
}

export function createGensynAxlInvocationTransport(
  config: GensynAxlInvocationTransportConfig
): InvocationTransport {
  return {
    async invoke<TReq, TRes>(peerId: string, service: string, payload: TReq, timeoutMs: number): Promise<TRes> {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      const requestId = createRequestId();

      try {
        const response = await fetch(
          `${config.baseUrl.replace(/\/$/, "")}/mcp/${encodeURIComponent(peerId)}/${encodeURIComponent(service)}`,
          {
            method: "POST",
            headers: {
              "content-type": "application/json",
              ...config.headers
            },
            body: JSON.stringify({
              jsonrpc: "2.0",
              id: requestId,
              method: service,
              params: payload
            }),
            signal: controller.signal
          }
        );

        if (!response.ok) {
          const body = await response.text();
          throw new Error(`Gensyn AXL invocation failed with status ${response.status}: ${body}`);
        }

        const body = (await response.json()) as unknown;
        if (isJsonRpcFailure(body)) {
          throw new Error(`Gensyn AXL JSON-RPC error: ${body.error.message ?? body.error.code ?? "unknown error"}`);
        }
        if (isJsonRpcSuccess<TRes>(body)) {
          return unwrapJsonRpcResult(body.result);
        }

        return unwrapJsonRpcResult(body as TRes);
      } finally {
        clearTimeout(timer);
      }
    }
  };
}

function unwrapJsonRpcResult<T>(value: T): T {
  if (isJsonRpcSuccess<T>(value)) {
    return value.result;
  }
  return value;
}

function isJsonRpcSuccess<T>(value: unknown): value is JsonRpcSuccess<T> {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as Record<string, unknown>).jsonrpc === "2.0" &&
    "result" in value
  );
}

function isJsonRpcFailure(value: unknown): value is JsonRpcFailure {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as Record<string, unknown>).jsonrpc === "2.0" &&
    "error" in value
  );
}

function createRequestId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
