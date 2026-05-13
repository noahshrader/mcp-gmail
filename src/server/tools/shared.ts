import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

export type ToolErrorPayload = Record<'error' | 'code', string>;

function toStructuredContent(payload: object): Record<string, unknown> {
  return payload as unknown as Record<string, unknown>;
}

export function createToolResult<T extends object>(payload: T, isError = false): CallToolResult {
  return {
    content: [{ type: 'text', text: JSON.stringify(payload, null, 2) }],
    structuredContent: toStructuredContent(payload),
    isError,
  };
}

function createToolError(error: unknown, code = 'gmail/internal_error'): CallToolResult {
  const payload: ToolErrorPayload = {
    error: error instanceof Error ? error.message : String(error),
    code,
  };

  return createToolResult(payload, true);
}

export async function runTool(
  handler: () => Promise<object>,
  errorCode?: string
): Promise<CallToolResult> {
  try {
    return createToolResult(await handler());
  } catch (error) {
    return createToolError(error, errorCode);
  }
}