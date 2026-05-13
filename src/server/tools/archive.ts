import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { ServerDependencies } from '../types.js';
import { dryRunSchema, idSchema } from './schemas.js';
import { runTool } from './shared.js';

const archiveInputSchema = z.object({
  id: idSchema,
  dryRun: dryRunSchema,
});

export function registerArchiveTool(server: McpServer, deps: ServerDependencies): void {
  server.registerTool(
    'gmail_archive',
    {
      description: 'Archive a Gmail message by removing the INBOX label',
      inputSchema: archiveInputSchema,
    },
    async ({ id, dryRun }) =>
      runTool(
        async () => {
          const result = await deps.stateService().archiveMessage(id, dryRun);

          return {
            id: result.id,
            action: result.action,
            dryRun: result.dryRun,
          };
        }
      )
  );
}