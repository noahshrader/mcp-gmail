import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { ServerDependencies } from '../types.js';
import { idSchema } from './schemas.js';
import { runTool } from './shared.js';

const readThreadInputSchema = z.object({
  id: idSchema,
});

export function registerReadThreadTool(server: McpServer, deps: ServerDependencies): void {
  server.registerTool(
    'gmail_read_thread',
    {
      description: 'Read all messages in a Gmail thread',
      inputSchema: readThreadInputSchema,
    },
    async ({ id }) =>
      runTool(async () => ({ thread: await deps.threadService().getThread(id) }), 'gmail/read_thread_failed')
  );
}