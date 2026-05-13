import { describe, expect, it } from 'vitest';

import {
  GmailAuthError,
  GmailNotFoundError,
  GmailRateLimitError,
  GmailServerError,
  normalizeGmailError,
} from '../errors.js';

describe('normalizeGmailError', () => {
  it('classifies auth failures', () => {
    const error = Object.assign(new Error('Forbidden'), { status: 403 });

    expect(normalizeGmailError(error)).toBeInstanceOf(GmailAuthError);
  });

  it('classifies not found failures', () => {
    const error = Object.assign(new Error('Missing message'), { status: 404 });

    expect(normalizeGmailError(error)).toBeInstanceOf(GmailNotFoundError);
  });

  it('classifies rate limit failures', () => {
    const error = Object.assign(new Error('Slow down'), {
      status: 429,
      errors: [{ reason: 'rateLimitExceeded' }],
    });

    expect(normalizeGmailError(error)).toBeInstanceOf(GmailRateLimitError);
  });

  it('classifies server failures', () => {
    const error = Object.assign(new Error('Backend unavailable'), { status: 503 });

    expect(normalizeGmailError(error)).toBeInstanceOf(GmailServerError);
  });
});