import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { ServerDependencies } from '../types.js';
import { idSchema, includeBodySchema } from './schemas.js';
import { runTool } from './shared.js';

const readMessageInputSchema = z.object({
  id: idSchema,
  includeBody: includeBodySchema,
});

export function registerReadMessageTool(server: McpServer, deps: ServerDependencies): void {
  server.registerTool(
    'gmail_read_message',
    {
      description: 'Read the full detail of a single Gmail message',
      inputSchema: readMessageInputSchema,
    },
    async ({ id, includeBody }) =>
      runTool(
        async () => ({
          message: await deps.messageService().getMessage(id, includeBody),
        })
      )
  );
}