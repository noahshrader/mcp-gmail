import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

import { createServerDependencies } from './dependencies.js';
import { registerApplyLabelsTool } from './tools/apply_labels.js';
import { registerArchiveTool } from './tools/archive.js';
import { registerCreateDraftTool } from './tools/create_draft.js';
import { registerCreateReplyDraftTool } from './tools/create_reply_draft.js';
import { registerDiagnosticsTool } from './tools/diagnostics.js';
import { registerListLabelsTool } from './tools/list_labels.js';
import { registerMarkReadTool } from './tools/mark_read.js';
import { registerMarkUnreadTool } from './tools/mark_unread.js';
import { registerReadMessageTool } from './tools/read_message.js';
import { registerReadThreadTool } from './tools/read_thread.js';
import { registerRemoveLabelsTool } from './tools/remove_labels.js';
import { registerSearchTool } from './tools/search.js';
import { registerSendDraftTool } from './tools/send_draft.js';
import { registerTrashTool } from './tools/trash.js';
import { registerUpdateDraftTool } from './tools/update_draft.js';
import type { ServerDependencyOverrides } from './types.js';

export function createServer(overrides: ServerDependencyOverrides = {}): McpServer {
  const deps = createServerDependencies(overrides);
  const server = new McpServer({
    name: 'mcp-gmail',
    version: deps.adapterVersion,
  });

  registerDiagnosticsTool(server, deps);
  registerListLabelsTool(server, deps);
  registerSearchTool(server, deps);
  registerReadMessageTool(server, deps);
  registerReadThreadTool(server, deps);
  registerCreateDraftTool(server, deps);
  registerUpdateDraftTool(server, deps);
  registerSendDraftTool(server, deps);
  registerCreateReplyDraftTool(server, deps);
  registerArchiveTool(server, deps);
  registerMarkReadTool(server, deps);
  registerMarkUnreadTool(server, deps);
  registerApplyLabelsTool(server, deps);
  registerRemoveLabelsTool(server, deps);
  registerTrashTool(server, deps);

  return server;
}

export async function startServer(overrides: ServerDependencyOverrides = {}): Promise<void> {
  const server = createServer(overrides);
  const transport = new StdioServerTransport();

  await server.connect(transport);
}