import { google, gmail_v1 } from 'googleapis';

import { getAuthClient } from './auth.js';
import { acquireRateLimitToken } from './rateLimit.js';
import { withRetry } from './retry.js';
import { READONLY_SCOPES } from './scopes.js';

export type GmailClientFactory = () => Promise<gmail_v1.Gmail>;

const wrappedObjects = new WeakMap<object, object>();

function wrapGmailApi<T>(value: T): T {
  if (!value || (typeof value !== 'object' && typeof value !== 'function')) {
    return value;
  }

  const cached = wrappedObjects.get(value as object);

  if (cached) {
    return cached as T;
  }

  const wrapped = new Proxy(value as object, {
    get(target, property, receiver) {
      const member = Reflect.get(target, property, receiver);

      if (typeof member === 'function') {
        return async (...args: unknown[]) =>
          withRetry(async () => {
            await acquireRateLimitToken();
            return Reflect.apply(member, target, args);
          });
      }

      return wrapGmailApi(member);
    },
  });

  wrappedObjects.set(value as object, wrapped);
  return wrapped as T;
}

export async function getGmailClient(scopes: string[] = READONLY_SCOPES): Promise<gmail_v1.Gmail> {
  const auth = await getAuthClient(scopes);
  return wrapGmailApi(google.gmail({ version: 'v1', auth }));
}