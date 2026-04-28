export interface ToolInvocationRequest<TInput = unknown> {
  requestId: string;
  traceId: string;
  toolId: string;
  capability: string;
  manifestUri: string;
  manifestHash: string;
  caller: {
    agentId: string;
    sessionId?: string;
  };
  input: TInput;
  inputHash: string;
  sentAt: string;
}

export interface ToolInvocationResponse<TOutput = unknown> {
  requestId: string;
  traceId: string;
  toolId: string;
  status: "ok" | "error";
  output?: TOutput;
  outputHash?: string;
  error?: {
    code: string;
    message: string;
    retriable?: boolean;
  };
  artifacts?: Array<{
    name: string;
    mediaType: string;
    uri?: string;
    hash?: string;
  }>;
  finishedAt: string;
}

export interface AxlInvokeEnvelope<TInput = unknown> {
  kind: "otm.tool.invoke";
  request: ToolInvocationRequest<TInput>;
}

export interface AxlResultEnvelope<TOutput = unknown> {
  kind: "otm.tool.result";
  response: ToolInvocationResponse<TOutput>;
}

