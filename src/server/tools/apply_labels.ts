import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { ServerDependencies } from '../types.js';
import { dryRunSchema, idSchema, labelIdsSchema } from './schemas.js';
import { runTool } from './shared.js';

const applyLabelsInputSchema = z.object({
  id: idSchema,
  labelIds: labelIdsSchema,
  dryRun: dryRunSchema,
});

export function registerApplyLabelsTool(server: McpServer, deps: ServerDependencies): void {
  server.registerTool(
    'gmail_apply_labels',
    {
      description: 'Apply one or more labels to a Gmail message',
      inputSchema: applyLabelsInputSchema,
    },
    async ({ id, labelIds, dryRun }) =>
      runTool(
        async () => {
          const result = await deps.stateService().applyLabels(id, labelIds, dryRun);

          return {
            id: result.id,
            appliedLabelIds: result.labelIds ?? [],
            dryRun: result.dryRun,
          };
        },
        'gmail/apply_labels_failed'
      )
  );
}