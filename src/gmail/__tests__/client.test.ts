import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('getGmailClient', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
  });

  it('wraps Gmail API methods with retry support', async () => {
    const get = vi
      .fn()
      .mockRejectedValueOnce(Object.assign(new Error('Temporary failure'), { status: 503 }))
      .mockResolvedValue({ data: { id: 'message-1' } });

    vi.doMock('../auth.js', () => ({
      getAuthClient: vi.fn(async () => ({ token: 'auth' })),
    }));
    vi.doMock('../rateLimit.js', () => ({
      acquireRateLimitToken: vi.fn(async () => undefined),
    }));
    vi.doMock('googleapis', () => ({
      google: {
        gmail: vi.fn(() => ({
          users: {
            messages: {
              get,
            },
          },
        })),
      },
    }));

    const { getGmailClient } = await import('../client.js');
    const gmail = await getGmailClient();
    const result = await gmail.users.messages.get({ userId: 'me', id: 'message-1' });

    expect(result).toEqual({ data: { id: 'message-1' } });
    expect(get).toHaveBeenCalledTimes(2);
  });
});