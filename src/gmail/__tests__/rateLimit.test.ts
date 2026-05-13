import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('acquireRateLimitToken', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-13T00:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('waits for capacity when the bucket is empty', async () => {
    const { acquireRateLimitToken } = await import('../rateLimit.js');

    await acquireRateLimitToken(200);

    const pending = acquireRateLimitToken(1);
    await vi.advanceTimersByTimeAsync(5);

    await expect(pending).resolves.toBeUndefined();
  });
});