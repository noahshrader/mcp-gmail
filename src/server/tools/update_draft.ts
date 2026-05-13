import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { ServerDependencies } from '../types.js';
import {
  bodySchema,
  dryRunSchema,
  idSchema,
  optionalAddressListSchema,
  optionalSubjectSchema,
} from './schemas.js';
import { runTool } from './shared.js';

const updateDraftInputSchema = z.object({
  id: idSchema,
  to: optionalAddressListSchema,
  subject: optionalSubjectSchema,
  body: bodySchema,
  cc: optionalAddressListSchema,
  bcc: optionalAddressListSchema,
  dryRun: dryRunSchema,
});

export function registerUpdateDraftTool(server: McpServer, deps: ServerDependencies): void {
  server.registerTool(
    'gmail_update_draft',
    {
      description: 'Update an existing Gmail draft or return a dry-run preview',
      inputSchema: updateDraftInputSchema,
    },
    async ({ id, to, subject, body, cc, bcc, dryRun }) =>
      runTool(
        async () =>
          deps.draftService().updateDraft(id, { to, subject, body, cc, bcc }, dryRun)
      )
  );
}