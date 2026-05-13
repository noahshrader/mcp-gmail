import { Command } from 'commander';

import { formatDraftResult, formatSendResult } from '../format.js';
import type { CliDependencies } from '../types.js';

function parseAddressList(value: string): string[] {
  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function resolveDryRun(options: { confirm?: boolean; dryRun?: boolean }): boolean {
  return options.dryRun || !options.confirm;
}

interface DraftCommandOptions {
  to?: string[];
  subject?: string;
  body: string;
  cc?: string[];
  bcc?: string[];
  confirm?: boolean;
  dryRun?: boolean;
}

export function registerDraftCommands(command: Command, deps: CliDependencies): void {
  command
    .command('create')
    .description('Create a new draft or preview it')
    .option('--to <addresses>', 'Comma-separated recipient list', parseAddressList)
    .option('--subject <subject>', 'Draft subject')
    .requiredOption('--body <body>', 'Draft body')
    .option('--cc <addresses>', 'Comma-separated CC recipient list', parseAddressList)
    .option('--bcc <addresses>', 'Comma-separated BCC recipient list', parseAddressList)
    .option('--dry-run', 'Force preview mode')
    .option('--confirm', 'Create the draft in Gmail')
    .action(async (options: DraftCommandOptions) => {
      const result = await deps.draftService().createDraft(
        {
          to: options.to,
          subject: options.subject,
          body: options.body,
          cc: options.cc,
          bcc: options.bcc,
        },
        resolveDryRun(options)
      );

      deps.stdout(formatDraftResult(result));
    });

  command
    .command('update <id>')
    .description('Update an existing draft or preview the update')
    .option('--to <addresses>', 'Comma-separated recipient list', parseAddressList)
    .option('--subject <subject>', 'Draft subject')
    .requiredOption('--body <body>', 'Draft body')
    .option('--cc <addresses>', 'Comma-separated CC recipient list', parseAddressList)
    .option('--bcc <addresses>', 'Comma-separated BCC recipient list', parseAddressList)
    .option('--dry-run', 'Force preview mode')
    .option('--confirm', 'Update the draft in Gmail')
    .action(async (id: string, options: DraftCommandOptions) => {
      const result = await deps.draftService().updateDraft(
        id,
        {
          to: options.to,
          subject: options.subject,
          body: options.body,
          cc: options.cc,
          bcc: options.bcc,
        },
        resolveDryRun(options)
      );

      deps.stdout(formatDraftResult(result));
    });

  command
    .command('send <id>')
    .description('Preview or send an existing draft')
    .option('--dry-run', 'Force preview mode')
    .option('--confirm', 'Required to actually send the draft')
    .action(async (id: string, options: { confirm?: boolean; dryRun?: boolean }) => {
      const dryRun = resolveDryRun(options);
      const result = await deps.draftService().sendDraft(id, dryRun);
      deps.stdout(formatSendResult(result));
    });

  command
    .command('reply <threadId>')
    .description('Create a reply draft or preview it')
    .requiredOption('--body <body>', 'Reply body')
    .option('--to <addresses>', 'Override the reply recipient list', parseAddressList)
    .option('--subject <subject>', 'Override the reply subject')
    .option('--cc <addresses>', 'Comma-separated CC recipient list', parseAddressList)
    .option('--bcc <addresses>', 'Comma-separated BCC recipient list', parseAddressList)
    .option('--dry-run', 'Force preview mode')
    .option('--confirm', 'Create the reply draft in Gmail')
    .action(async (threadId: string, options: DraftCommandOptions) => {
      const result = await deps.draftService().createReplyDraft(
        threadId,
        {
          to: options.to,
          subject: options.subject,
          body: options.body,
          cc: options.cc,
          bcc: options.bcc,
        },
        resolveDryRun(options)
      );

      deps.stdout(formatDraftResult(result));
    });
}