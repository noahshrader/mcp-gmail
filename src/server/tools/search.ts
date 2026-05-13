import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { ServerDependencies } from '../types.js';
import { maxResultsSchema, pageTokenSchema, querySchema } from './schemas.js';
import { runTool } from './shared.js';

const searchInputSchema = z.object({
  query: querySchema,
  maxResults: maxResultsSchema,
  pageToken: pageTokenSchema,
});

export function registerSearchTool(server: McpServer, deps: ServerDependencies): void {
  server.registerTool(
    'gmail_search',
    {
      description: 'Search Gmail messages using Gmail query syntax',
      inputSchema: searchInputSchema,
    },
    async ({ query, maxResults, pageToken }) =>
      runTool(
        async () => ({
          messages: await deps.messageService().searchMessages(query, { maxResults, pageToken }),
        }),
        'gmail/search_failed'
      )
  );
}