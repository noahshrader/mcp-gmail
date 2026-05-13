import { Command } from 'commander';

import { formatLabelTable } from '../format.js';
import type { CliDependencies } from '../types.js';

export function registerLabelCommands(command: Command, deps: CliDependencies): void {
  command
    .command('list')
    .description('List Gmail labels')
    .action(async () => {
      const labels = await deps.labelService().listLabels();
      deps.stdout(formatLabelTable(labels));
    });
}