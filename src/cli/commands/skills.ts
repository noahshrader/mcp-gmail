import { Command } from 'commander';

import type { CliDependencies } from '../types.js';

export function registerSkillCommands(command: Command, deps: CliDependencies): void {
  command
    .command('list')
    .description('List available skills')
    .action(() => {
      deps.stdout('Skills not yet implemented.\n');
    });

  command
    .command('read <name>')
    .description('Read a skill definition')
    .action(() => {
      deps.stdout('Skills not yet implemented.\n');
    });
}