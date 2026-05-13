import { rm } from 'node:fs/promises';

import { Command } from 'commander';

import { COMPOSE_SCOPES, READONLY_SCOPES, SEND_SCOPES } from '../../gmail/scopes.js';
import type { CliDependencies } from '../types.js';

const CLI_AUTH_SCOPES = [...READONLY_SCOPES, ...COMPOSE_SCOPES, ...SEND_SCOPES];
const GOOGLE_REVOKE_URL = 'https://myaccount.google.com/permissions';

export function registerAuthCommands(command: Command, deps: CliDependencies): void {
  command
    .command('login')
    .description('Authenticate with Gmail and save the local token')
    .action(async () => {
      await deps.authorize(CLI_AUTH_SCOPES);
      const status = await deps.getAuthStatus(CLI_AUTH_SCOPES);

      deps.stdout(
        [
          'Authentication succeeded.',
          `Authenticated: ${status.authenticated ? 'yes' : 'no'}`,
          `Token expiry: ${status.tokenExpiry ?? 'unknown'}`,
          `Scopes: ${status.scopes.length > 0 ? status.scopes.join(', ') : '-'}`,
          `Credentials path: ${status.credentialsPath}`,
          `Token path: ${status.tokenPath}`,
          '',
        ].join('\n')
      );
    });

  command
    .command('status')
    .description('Show local Gmail authentication status')
    .action(async () => {
      const status = await deps.getAuthStatus(CLI_AUTH_SCOPES);

      deps.stdout(
        [
          `Authenticated: ${status.authenticated ? 'yes' : 'no'}`,
          `Token expiry: ${status.tokenExpiry ?? 'unknown'}`,
          `Scopes: ${status.scopes.length > 0 ? status.scopes.join(', ') : '-'}`,
          `Credentials path: ${status.credentialsPath}`,
          `Token path: ${status.tokenPath}`,
          '',
        ].join('\n')
      );
    });

  command
    .command('revoke')
    .description('Delete the local token file and print the Google revoke page')
    .action(async () => {
      const tokenPath = deps.getTokenPath();
      await rm(tokenPath, { force: true });

      deps.stdout(
        [
          `Deleted local token file: ${tokenPath}`,
          `To revoke the app in your Google account, visit: ${GOOGLE_REVOKE_URL}`,
          '',
        ].join('\n')
      );
    });
}