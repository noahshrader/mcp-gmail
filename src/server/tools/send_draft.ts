import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { ServerDependencies } from '../types.js';
import { dryRunSchema, idSchema } from './schemas.js';
import { runTool } from './shared.js';

const sendDraftInputSchema = z.object({
  id: idSchema,
  dryRun: dryRunSchema,
});

export function registerSendDraftTool(server: McpServer, deps: ServerDependencies): void {
  server.registerTool(
    'gmail_send_draft',
    {
      description: 'Send an existing draft or return a dry-run preview',
      inputSchema: sendDraftInputSchema,
    },
    async ({ id, dryRun }) =>
      runTool(async () => deps.draftService().sendDraft(id, dryRun), 'gmail/send_draft_failed')
  );
}