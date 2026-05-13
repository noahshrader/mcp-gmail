import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import { MODIFY_SCOPES, READONLY_SCOPES, SEND_SCOPES } from '../../gmail/scopes.js';
import type { ServerDependencies } from '../types.js';
import { runTool } from './shared.js';

const SERVER_AUTH_SCOPES = [...READONLY_SCOPES, ...SEND_SCOPES, ...MODIFY_SCOPES];

export function registerDiagnosticsTool(server: McpServer, deps: ServerDependencies): void {
  server.registerTool(
    'gmail_diagnostics',
    {
      description: 'Report Gmail adapter authentication status and server version',
    },
    async () =>
      runTool(async () => {
        const status = await deps.getAuthStatus(SERVER_AUTH_SCOPES);

        return {
          authenticated: status.authenticated,
          tokenExpiry: status.tokenExpiry ?? null,
          scopes: status.scopes,
          adapterVersion: deps.adapterVersion,
        };
      }, 'gmail/diagnostics_failed')
  );
}