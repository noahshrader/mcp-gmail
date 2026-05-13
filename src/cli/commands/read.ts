import { Command } from 'commander';

import { formatMessageDetail, formatThreadDetail } from '../format.js';
import type { CliDependencies } from '../types.js';

export function registerMessageReadCommand(command: Command, deps: CliDependencies): void {
  command
    .command('read <id>')
    .description('Read a single Gmail message')
    .option('--no-body', 'Skip the message body')
    .action(async (id: string, options: { body: boolean }) => {
      const message = await deps.messageService().getMessage(id, options.body);
      deps.stdout(formatMessageDetail(message));
    });
}

export function registerThreadReadCommand(command: Command, deps: CliDependencies): void {
  command
    .command('read <id>')
    .description('Read all messages in a Gmail thread')
    .action(async (id: string) => {
      const thread = await deps.threadService().getThread(id);
      deps.stdout(formatThreadDetail(thread));
    });
}