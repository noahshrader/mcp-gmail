import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { ServerDependencies } from '../types.js';
import { dryRunSchema, idSchema } from './schemas.js';
import { runTool } from './shared.js';

const markReadInputSchema = z.object({
  id: idSchema,
  dryRun: dryRunSchema,
});

export function registerMarkReadTool(server: McpServer, deps: ServerDependencies): void {
  server.registerTool(
    'gmail_mark_read',
    {
      description: 'Mark a Gmail message as read',
      inputSchema: markReadInputSchema,
    },
    async ({ id, dryRun }) =>
      runTool(
        async () => {
          const result = await deps.stateService().markRead(id, dryRun);

          return {
            id: result.id,
            action: result.action,
            dryRun: result.dryRun,
          };
        },
        'gmail/mark_read_failed'
      )
  );
}