import { Command } from 'commander';

import { formatMessageSummaryTable } from '../format.js';
import type { CliDependencies } from '../types.js';

function parsePositiveInteger(value: string): number {
  const parsed = Number.parseInt(value, 10);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`Expected a positive integer but received: ${value}`);
  }

  return parsed;
}

export function registerMessageSearchCommand(command: Command, deps: CliDependencies): void {
  command
    .command('search <query>')
    .description('Search Gmail messages using Gmail query syntax')
    .option('--max-results <count>', 'Maximum number of messages to return', parsePositiveInteger)
    .option('--page-token <token>', 'Opaque Gmail page token')
    .action(async (query: string, options: { maxResults?: number; pageToken?: string }) => {
      const messages = await deps.messageService().searchMessages(query, {
        maxResults: options.maxResults,
        pageToken: options.pageToken,
      });

      deps.stdout(formatMessageSummaryTable(messages));
    });
}