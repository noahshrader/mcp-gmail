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

const createReplyDraftInputSchema = z.object({
  threadId: idSchema,
  body: bodySchema,
  replyToMessageId: idSchema.optional(),
  to: optionalAddressListSchema,
  subject: optionalSubjectSchema,
  cc: optionalAddressListSchema,
  bcc: optionalAddressListSchema,
  dryRun: dryRunSchema,
});

export function registerCreateReplyDraftTool(server: McpServer, deps: ServerDependencies): void {
  server.registerTool(
    'gmail_create_reply_draft',
    {
      description: 'Create a reply draft for a Gmail thread or return a dry-run preview',
      inputSchema: createReplyDraftInputSchema,
    },
    async ({ threadId, body, replyToMessageId, to, subject, cc, bcc, dryRun }) =>
      runTool(
        async () =>
          deps
            .draftService()
            .createReplyDraft(threadId, { body, replyToMessageId, to, subject, cc, bcc }, dryRun),
        'gmail/create_reply_draft_failed'
      )
  );
}