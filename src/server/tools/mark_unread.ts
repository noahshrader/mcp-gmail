import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { ServerDependencies } from '../types.js';
import { dryRunSchema, idSchema } from './schemas.js';
import { runTool } from './shared.js';

const markUnreadInputSchema = z.object({
  id: idSchema,
  dryRun: dryRunSchema,
});

export function registerMarkUnreadTool(server: McpServer, deps: ServerDependencies): void {
  server.registerTool(
    'gmail_mark_unread',
    {
      description: 'Mark a Gmail message as unread',
      inputSchema: markUnreadInputSchema,
    },
    async ({ id, dryRun }) =>
      runTool(
        async () => {
          const result = await deps.stateService().markUnread(id, dryRun);

          return {
            id: result.id,
            action: result.action,
            dryRun: result.dryRun,
          };
        }
      )
  );
}