import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type MockServer = {
  address: () => { port: number };
  close: ReturnType<typeof vi.fn>;
  listen: (port: number, host: string, callback: () => void) => void;
  on: (event: string, handler: (request: { url?: string }, response: MockResponse) => void) => void;
  once: (event: string, handler: (error?: unknown) => void) => void;
};

type MockResponse = {
  end: ReturnType<typeof vi.fn>;
  statusCode?: number;
};

class MockOAuth2Client {
  credentials: Record<string, unknown> = {};
  readonly generateAuthUrl = vi.fn(({ state }: { state: string }) => `https://example.com/auth?state=${state}`);
  readonly getToken = vi.fn(async () => ({
    tokens: {
      access_token: 'new-access-token',
      refresh_token: 'refresh-token',
      scope: 'https://www.googleapis.com/auth/gmail.readonly',
      expiry_date: Date.now() + 3_600_000,
    },
  }));
  readonly refreshAccessToken = vi.fn(async () => ({
    credentials: {
      access_token: 'refreshed-access-token',
      expiry_date: Date.now() + 3_600_000,
    },
  }));
  readonly on = vi.fn();

  setCredentials(credentials: Record<string, unknown>): void {
    this.credentials = credentials;
  }
}

describe('auth', () => {
  const originalEnv = { ...process.env };
  const mockReadFile = vi.fn();
  const mockWriteFile = vi.fn();
  const mockMkdir = vi.fn();
  const mockSpawn = vi.fn(() => ({ unref: vi.fn() }));
  const oauthClients: MockOAuth2Client[] = [];
  let requestHandler: ((request: { url?: string }, response: MockResponse) => void) | undefined;

  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
    process.env = { ...originalEnv };
    requestHandler = undefined;
    oauthClients.length = 0;

    vi.doMock('node:fs/promises', () => ({
      mkdir: mockMkdir,
      readFile: mockReadFile,
      writeFile: mockWriteFile,
    }));
    vi.doMock('node:child_process', () => ({ spawn: mockSpawn }));
    vi.doMock('node:http', () => ({
      createServer: (): MockServer => ({
        address: () => ({ port: 43123 }),
        close: vi.fn(),
        listen: (_port: number, _host: string, callback: () => void) => {
          callback();
          queueMicrotask(() => {
            requestHandler?.(
              { url: '/oauth2callback?state=test-state&code=oauth-code' },
              { end: vi.fn() }
            );
          });
        },
        on: (event, handler) => {
          if (event === 'request') {
            requestHandler = handler;
          }
        },
        once: () => {},
      }),
    }));
    vi.doMock('node:crypto', () => ({ randomUUID: () => 'test-state' }));
    vi.doMock('googleapis', () => ({
      google: {
        auth: {
          OAuth2: vi.fn(() => {
            const client = new MockOAuth2Client();
            oauthClients.push(client);
            return client;
          }),
        },
      },
    }));
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.doUnmock('node:fs/promises');
    vi.doUnmock('node:child_process');
    vi.doUnmock('node:http');
    vi.doUnmock('node:crypto');
    vi.doUnmock('googleapis');
  });

  it('authorizes through the local OAuth flow when no saved token exists', async () => {
    mockReadFile.mockImplementation(async (filePath: string) => {
      if (filePath.endsWith('credentials.json')) {
        return JSON.stringify({
          installed: {
            client_id: 'client-id',
            client_secret: 'client-secret',
            redirect_uris: ['http://127.0.0.1'],
          },
        });
      }

      const error = new Error('missing') as NodeJS.ErrnoException;
      error.code = 'ENOENT';
      throw error;
    });

    const { authorize } = await import('../auth.js');
    const client = await authorize();

    expect(client).toBeDefined();
    expect(mockSpawn).toHaveBeenCalledOnce();
    expect(oauthClients.some((oauthClient) => oauthClient.generateAuthUrl.mock.calls.length > 0)).toBe(true);
    expect(oauthClients.some((oauthClient) => oauthClient.getToken.mock.calls.length > 0)).toBe(true);
    expect(oauthClients[1]?.getToken).toHaveBeenCalledWith({
      code: 'oauth-code',
      redirect_uri: 'http://127.0.0.1:43123/oauth2callback',
    });
    expect(mockWriteFile).toHaveBeenCalled();
  });

  it('refreshes a near-expiry token before returning the auth client', async () => {
    mockReadFile.mockImplementation(async (filePath: string) => {
      if (filePath.endsWith('credentials.json')) {
        return JSON.stringify({
          installed: {
            client_id: 'client-id',
            client_secret: 'client-secret',
            redirect_uris: ['http://127.0.0.1'],
          },
        });
      }

      return JSON.stringify({
        access_token: 'stale-token',
        refresh_token: 'refresh-token',
        scope: 'https://www.googleapis.com/auth/gmail.readonly',
        expiry_date: Date.now() + 60_000,
      });
    });

    const { getAuthClient } = await import('../auth.js');
    const client = await getAuthClient();

    expect(client.credentials.access_token).toBe('refreshed-access-token');
    expect(oauthClients[0]?.refreshAccessToken).toHaveBeenCalledOnce();
    expect(mockWriteFile).toHaveBeenCalled();
  });

  it('reports auth status from the saved token', async () => {
    mockReadFile.mockImplementation(async (filePath: string) => {
      if (filePath.endsWith('token.json')) {
        return JSON.stringify({
          scope: 'https://www.googleapis.com/auth/gmail.readonly',
          expiry_date: Date.UTC(2026, 4, 13, 12, 0, 0),
        });
      }

      const error = new Error('missing') as NodeJS.ErrnoException;
      error.code = 'ENOENT';
      throw error;
    });

    const { getAuthStatus } = await import('../auth.js');
    const status = await getAuthStatus();

    expect(status.authenticated).toBe(true);
    expect(status.scopes).toEqual(['https://www.googleapis.com/auth/gmail.readonly']);
    expect(status.tokenExpiry).toBe('2026-05-13T12:00:00.000Z');
  });
});