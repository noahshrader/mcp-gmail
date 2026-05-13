import { createServer } from 'node:http';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';

import { google } from 'googleapis';
import type { Credentials, OAuth2Client } from 'google-auth-library';

import { READONLY_SCOPES } from './scopes.js';

interface OAuthClientConfig {
  client_id: string;
  client_secret: string;
  redirect_uris: string[];
}

interface CredentialsFile {
  installed?: OAuthClientConfig;
  web?: OAuthClientConfig;
}

export interface AuthStatus {
  authenticated: boolean;
  tokenExpiry?: string;
  scopes: string[];
  credentialsPath: string;
  tokenPath: string;
}

function resolvePath(value: string | undefined, fallbackRelativePath: string): string {
  return value ?? join(homedir(), fallbackRelativePath);
}

export function getCredentialsPath(): string {
  return resolvePath(process.env.GMAIL_MCP_CREDENTIALS_PATH, '.gmail-mcp/credentials.json');
}

export function getTokenPath(): string {
  return resolvePath(process.env.GMAIL_MCP_TOKEN_PATH, '.gmail-mcp/token.json');
}

async function ensureParentDirectory(filePath: string): Promise<void> {
  await mkdir(dirname(filePath), { recursive: true });
}

async function readJsonFile<T>(filePath: string): Promise<T | undefined> {
  try {
    const content = await readFile(filePath, 'utf8');
    return JSON.parse(content) as T;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return undefined;
    }

    throw error;
  }
}

async function writeJsonFile(filePath: string, value: unknown): Promise<void> {
  await ensureParentDirectory(filePath);
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

async function loadCredentialsFile(): Promise<OAuthClientConfig> {
  const credentialsPath = getCredentialsPath();
  const credentialsFile = await readJsonFile<CredentialsFile>(credentialsPath);
  const config = credentialsFile?.installed ?? credentialsFile?.web;

  if (!config) {
    throw new Error(`Missing OAuth client configuration at ${credentialsPath}`);
  }

  return config;
}

function normalizeScopes(scopes: string[]): string[] {
  return [...new Set(scopes)].sort();
}

function hasRequiredScopes(token: Credentials | undefined, requiredScopes: string[]): boolean {
  if (!token?.scope) {
    return false;
  }

  const grantedScopes = new Set(token.scope.split(' ').filter(Boolean));
  return requiredScopes.every((scope) => grantedScopes.has(scope));
}

function openBrowser(url: string): void {
  const platform = process.platform;
  const command =
    platform === 'darwin' ? 'open' : platform === 'win32' ? 'start' : 'xdg-open';

  const child = spawn(command, [url], {
    detached: true,
    stdio: 'ignore',
    shell: platform === 'win32'
  });

  child.unref();
}

async function waitForOAuthCode(
  config: OAuthClientConfig,
  scopes: string[]
): Promise<{ client: OAuth2Client; tokens: Credentials }> {
  const state = randomUUID();
  const server = createServer();

  const codePromise = new Promise<string>((resolve, reject) => {
    server.on('request', (request, response) => {
      try {
        const requestUrl = new URL(request.url ?? '/', `http://127.0.0.1:${(server.address() as { port: number }).port}`);
        const returnedState = requestUrl.searchParams.get('state');
        const code = requestUrl.searchParams.get('code');
        const error = requestUrl.searchParams.get('error');

        if (error) {
          response.statusCode = 400;
          response.end('OAuth authorization failed. You can close this window.');
          reject(new Error(`OAuth authorization failed: ${error}`));
          return;
        }

        if (returnedState !== state || !code) {
          response.statusCode = 400;
          response.end('Invalid OAuth response. You can close this window.');
          reject(new Error('Invalid OAuth callback state or missing code'));
          return;
        }

        response.statusCode = 200;
        response.end('Authorization complete. You can close this window.');
        resolve(code);
      } catch (error) {
        reject(error);
      }
    });
  });

  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => resolve());
  });

  const address = server.address();

  if (!address || typeof address === 'string') {
    server.close();
    throw new Error('Failed to start local OAuth callback server');
  }

  const redirectUri = `http://127.0.0.1:${address.port}/oauth2callback`;
  const client = new google.auth.OAuth2(config.client_id, config.client_secret, redirectUri);

  const authorizationUrl = client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: scopes,
    state
  });

  process.stderr.write(`Open this URL to authorize Gmail MCP:\n${authorizationUrl}\n`);
  openBrowser(authorizationUrl);

  try {
    const code = await codePromise;
    const { tokens } = await client.getToken({ code, redirect_uri: redirectUri });

    if (!tokens.refresh_token) {
      process.stderr.write(
        'OAuth response did not include a refresh token. Re-run after revoking prior consent if needed.\n'
      );
    }

    return { client, tokens };
  } finally {
    server.close();
  }
}

function createOAuthClient(config: OAuthClientConfig): OAuth2Client {
  const redirectUri = config.redirect_uris[0] ?? 'http://127.0.0.1';
  return new google.auth.OAuth2(config.client_id, config.client_secret, redirectUri);
}

function attachTokenRefreshListener(client: OAuth2Client, tokenPath: string): void {
  client.on('tokens', async (tokens) => {
    await writeJsonFile(tokenPath, { ...client.credentials, ...tokens });
  });
}

export async function authorize(scopes: string[] = READONLY_SCOPES): Promise<OAuth2Client> {
  const requiredScopes = normalizeScopes(scopes);
  const config = await loadCredentialsFile();
  const client = createOAuthClient(config);
  const tokenPath = getTokenPath();
  const savedToken = await readJsonFile<Credentials>(tokenPath);

  if (savedToken && hasRequiredScopes(savedToken, requiredScopes)) {
    client.setCredentials(savedToken);
    attachTokenRefreshListener(client, tokenPath);
    return client;
  }

  const authorized = await waitForOAuthCode(config, requiredScopes);
  authorized.client.setCredentials(authorized.tokens);
  await writeJsonFile(tokenPath, authorized.client.credentials);
  attachTokenRefreshListener(authorized.client, tokenPath);
  return authorized.client;
}

export async function getAuthClient(scopes: string[] = READONLY_SCOPES): Promise<OAuth2Client> {
  return authorize(scopes);
}

export async function getAuthStatus(scopes: string[] = READONLY_SCOPES): Promise<AuthStatus> {
  const token = await readJsonFile<Credentials>(getTokenPath());
  const normalizedScopes = token?.scope ? token.scope.split(' ').filter(Boolean).sort() : [];

  return {
    authenticated: hasRequiredScopes(token, normalizeScopes(scopes)),
    tokenExpiry: token?.expiry_date ? new Date(token.expiry_date).toISOString() : undefined,
    scopes: normalizedScopes,
    credentialsPath: getCredentialsPath(),
    tokenPath: getTokenPath()
  };
}