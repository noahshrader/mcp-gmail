import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('callGmailApi', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
  });

  it('retries transient failures and applies rate limiting', async () => {
    const apiCall = vi
      .fn()
      .mockRejectedValueOnce(Object.assign(new Error('Temporary failure'), { status: 503 }))
      .mockResolvedValue({ data: { id: 'message-1' } });

    vi.doMock('../rateLimit.js', () => ({
      acquireRateLimitToken: vi.fn(async () => undefined),
    }));

    const { callGmailApi } = await import('../client.js');
    const result = await callGmailApi(() => apiCall());

    expect(result).toEqual({ data: { id: 'message-1' } });
    expect(apiCall).toHaveBeenCalledTimes(2);
  });
});