import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { ServerDependencies } from '../types.js';
import { runTool } from './shared.js';

export function registerListLabelsTool(server: McpServer, deps: ServerDependencies): void {
  server.registerTool(
    'gmail_list_labels',
    {
      description: 'Return all Gmail labels for the authenticated account',
    },
    async () =>
      runTool(async () => ({ labels: await deps.labelService().listLabels() }))
  );
}