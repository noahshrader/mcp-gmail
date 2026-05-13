import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

import { normalizeGmailError } from '../../gmail/errors.js';

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

function createToolError(error: unknown): CallToolResult {
  if (error instanceof Error) {
    const { message, code } = normalizeGmailError(error);
    return createToolResult({ error: message, code }, true);
  }

  return createToolResult({ error: String(error), code: 'gmail/internal_error' }, true);
}

export async function runTool(handler: () => Promise<object>): Promise<CallToolResult> {
  try {
    return createToolResult(await handler());
  } catch (error) {
    return createToolError(error);
  }
}