import { Command } from 'commander';

import type { CliDependencies } from '../types.js';

export function registerHistoryCommands(command: Command, deps: CliDependencies): void {
  command
    .command('list')
    .description('List recent run history')
    .action(() => {
      deps.stdout('Run history not yet implemented.\n');
    });

  command
    .command('clear')
    .description('Clear local run history')
    .action(() => {
      deps.stdout('Run history not yet implemented.\n');
    });
}