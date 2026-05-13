import { callGmailApi, getGmailClient, type GmailClientFactory } from './client.js';
import { READONLY_SCOPES } from './scopes.js';
import { toThreadDetail } from './transformers.js';
import type { ThreadDetail } from './types.js';

export class ThreadService {
  constructor(private readonly clientFactory: GmailClientFactory = () => getGmailClient(READONLY_SCOPES)) {}

  async getThread(id: string): Promise<ThreadDetail> {
    const gmail = await this.clientFactory();
    const response = await callGmailApi(() => gmail.users.threads.get({
      userId: 'me',
      id,
      format: 'full'
    }));

    return toThreadDetail(response.data);
  }
}