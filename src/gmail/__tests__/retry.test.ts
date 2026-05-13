import { describe, expect, it, vi } from 'vitest';

import { GmailInvalidInputError, GmailRateLimitError } from '../errors.js';
import { withRetry } from '../retry.js';

describe('withRetry', () => {
  it('retries transient Gmail failures', async () => {
    const fn = vi
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(new GmailRateLimitError('Rate limited'))
      .mockResolvedValue('ok');

    await expect(withRetry(fn, { attempts: 2, baseDelayMs: 1, maxDelayMs: 2 })).resolves.toBe('ok');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('does not retry non-retryable failures', async () => {
    const fn = vi
      .fn<() => Promise<string>>()
      .mockRejectedValue(new GmailInvalidInputError('Bad input'));

    await expect(withRetry(fn, { attempts: 3, baseDelayMs: 1, maxDelayMs: 2 })).rejects.toThrow(
      'Bad input'
    );
    expect(fn).toHaveBeenCalledOnce();
  });
});