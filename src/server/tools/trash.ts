import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { ServerDependencies } from '../types.js';
import { dryRunSchema, idSchema } from './schemas.js';
import { runTool } from './shared.js';

const trashInputSchema = z.object({
  id: idSchema,
  dryRun: dryRunSchema,
});

export function registerTrashTool(server: McpServer, deps: ServerDependencies): void {
  server.registerTool(
    'gmail_trash',
    {
      description: 'Move a Gmail message to trash',
      inputSchema: trashInputSchema,
    },
    async ({ id, dryRun }) =>
      runTool(
        async () => {
          const result = await deps.stateService().trashMessage(id, dryRun);

          return {
            id: result.id,
            action: result.action,
            dryRun: result.dryRun,
          };
        }
      )
  );
}