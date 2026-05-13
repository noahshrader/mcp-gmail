import { createRequire } from 'node:module';

import { Command } from 'commander';

import { registerAuthCommands } from './commands/auth.js';
import { registerDraftCommands } from './commands/draft.js';
import { registerHistoryCommands } from './commands/history.js';
import { registerLabelCommands } from './commands/labels.js';
import { registerMessageReadCommand, registerThreadReadCommand } from './commands/read.js';
import { registerMessageSearchCommand } from './commands/search.js';
import { registerSkillCommands } from './commands/skills.js';
import { createCliDependencies, type CliDependencies } from './types.js';

const require = createRequire(import.meta.url);
const packageJson = require('../../package.json') as { version?: string };

export function buildCli(overrides: Partial<CliDependencies> = {}): Command {
  const deps = createCliDependencies(overrides);
  const program = new Command();

  program
    .name('mcp-gmail')
    .description('Diagnostic and manual-testing CLI for the Gmail adapter')
    .version(packageJson.version ?? '0.0.0')
    .showHelpAfterError()
    .configureOutput({
      writeOut: deps.stdout,
      writeErr: deps.stderr,
      outputError: (text, write) => write(text),
    });

  const authCommand = program.command('auth').description('Authentication helpers');
  registerAuthCommands(authCommand, deps);

  const labelsCommand = program.command('labels').description('Label operations');
  registerLabelCommands(labelsCommand, deps);

  const messagesCommand = program.command('messages').description('Message search and read operations');
  registerMessageSearchCommand(messagesCommand, deps);
  registerMessageReadCommand(messagesCommand, deps);

  const threadsCommand = program.command('threads').description('Thread read operations');
  registerThreadReadCommand(threadsCommand, deps);

  const draftCommand = program.command('draft').description('Draft preview and send operations');
  registerDraftCommands(draftCommand, deps);

  const historyCommand = program.command('history').description('Run history commands');
  registerHistoryCommands(historyCommand, deps);

  const skillsCommand = program.command('skills').description('Skill inspection commands');
  registerSkillCommands(skillsCommand, deps);

  return program;
}