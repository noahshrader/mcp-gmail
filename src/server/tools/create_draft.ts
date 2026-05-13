import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { ServerDependencies } from '../types.js';
import {
  addressListSchema,
  bodySchema,
  dryRunSchema,
  optionalAddressListSchema,
  subjectSchema,
} from './schemas.js';
import { runTool } from './shared.js';

const createDraftInputSchema = z.object({
  to: addressListSchema,
  subject: subjectSchema,
  body: bodySchema,
  cc: optionalAddressListSchema,
  bcc: optionalAddressListSchema,
  dryRun: dryRunSchema,
});

export function registerCreateDraftTool(server: McpServer, deps: ServerDependencies): void {
  server.registerTool(
    'gmail_create_draft',
    {
      description: 'Create a new Gmail draft or return a dry-run preview',
      inputSchema: createDraftInputSchema,
    },
    async ({ to, subject, body, cc, bcc, dryRun }) =>
      runTool(
        async () =>
          deps.draftService().createDraft({ to, subject, body, cc, bcc }, dryRun),
        'gmail/create_draft_failed'
      )
  );
}