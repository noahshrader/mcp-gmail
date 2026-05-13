import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { ServerDependencies } from '../types.js';
import { dryRunSchema, idSchema, labelIdsSchema } from './schemas.js';
import { runTool } from './shared.js';

const removeLabelsInputSchema = z.object({
  id: idSchema,
  labelIds: labelIdsSchema,
  dryRun: dryRunSchema,
});

export function registerRemoveLabelsTool(server: McpServer, deps: ServerDependencies): void {
  server.registerTool(
    'gmail_remove_labels',
    {
      description: 'Remove one or more labels from a Gmail message',
      inputSchema: removeLabelsInputSchema,
    },
    async ({ id, labelIds, dryRun }) =>
      runTool(
        async () => {
          const result = await deps.stateService().removeLabels(id, labelIds, dryRun);

          return {
            id: result.id,
            removedLabelIds: result.labelIds ?? [],
            dryRun: result.dryRun,
          };
        }
      )
  );
}