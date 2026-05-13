import { google, gmail_v1 } from 'googleapis';

import { getAuthClient } from './auth.js';
import { READONLY_SCOPES } from './scopes.js';

export type GmailClientFactory = () => Promise<gmail_v1.Gmail>;

export async function getGmailClient(scopes: string[] = READONLY_SCOPES): Promise<gmail_v1.Gmail> {
  const auth = await getAuthClient(scopes);
  return google.gmail({ version: 'v1', auth });
}