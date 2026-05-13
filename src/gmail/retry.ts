import {
  GmailRateLimitError,
  GmailServerError,
  normalizeGmailError,
} from './errors.js';

export interface RetryOptions {
  attempts?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
}

const DEFAULT_RETRY_OPTIONS: Required<RetryOptions> = {
  attempts: 3,
  baseDelayMs: 500,
  maxDelayMs: 8_000,
};

function sleep(delayMs: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, delayMs);
  });
}

function getRetryDelayMs(attempt: number, options: Required<RetryOptions>): number {
  const backoffMs = Math.min(options.baseDelayMs * 2 ** (attempt - 1), options.maxDelayMs);
  const jitterMs = Math.floor(Math.random() * Math.min(250, backoffMs));
  return backoffMs + jitterMs;
}

function isRetryableError(error: unknown): boolean {
  const normalized = normalizeGmailError(error);
  return normalized instanceof GmailRateLimitError || normalized instanceof GmailServerError;
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const resolvedOptions: Required<RetryOptions> = {
    ...DEFAULT_RETRY_OPTIONS,
    ...options,
  };

  for (let attempt = 1; attempt <= resolvedOptions.attempts; attempt += 1) {
    try {
      return await fn();
    } catch (error) {
      if (attempt >= resolvedOptions.attempts || !isRetryableError(error)) {
        throw error;
      }

      await sleep(getRetryDelayMs(attempt, resolvedOptions));
    }
  }

  throw new Error('Retry loop exited without returning or throwing');
}