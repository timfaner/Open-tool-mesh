import type { AxlInvokeEnvelope, AxlResultEnvelope, ToolInvocationResponse } from "@opentoolmesh/shared";

export async function invokeToolHandler<TOutput>(
  envelope: AxlInvokeEnvelope<{ source: string }>,
  execute: (source: string) => Promise<TOutput>
): Promise<AxlResultEnvelope<TOutput>> {
  try {
    const output = await execute(envelope.request.input.source);
    const response: ToolInvocationResponse<TOutput> = {
      requestId: envelope.request.requestId,
      traceId: envelope.request.traceId,
      toolId: envelope.request.toolId,
      status: "ok",
      output,
      finishedAt: new Date().toISOString()
    };

    return {
      kind: "otm.tool.result",
      response
    };
  } catch (error) {
    return {
      kind: "otm.tool.result",
      response: {
        requestId: envelope.request.requestId,
        traceId: envelope.request.traceId,
        toolId: envelope.request.toolId,
        status: "error",
        error: {
          code: "tool_execution_failed",
          message: error instanceof Error ? error.message : "Unknown tool execution error"
        },
        finishedAt: new Date().toISOString()
      }
    };
  }
}
