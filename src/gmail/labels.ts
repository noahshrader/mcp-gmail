import { gmail_v1 } from 'googleapis';

import { getGmailClient, type GmailClientFactory } from './client.js';
import { READONLY_SCOPES } from './scopes.js';
import type { Label } from './types.js';

export class LabelService {
  constructor(private readonly clientFactory: GmailClientFactory = () => getGmailClient(READONLY_SCOPES)) {}

  async listLabels(): Promise<Label[]> {
    const gmail = await this.clientFactory();
    const response = await gmail.users.labels.list({ userId: 'me' });

    return (response.data.labels ?? []).map((label: gmail_v1.Schema$Label) => ({
      id: label.id ?? '',
      name: label.name ?? '',
      type: (label.type?.toLowerCase() === 'system' ? 'system' : 'user') as Label['type'],
      messagesTotal: label.messagesTotal ?? undefined,
      messagesUnread: label.messagesUnread ?? undefined
    }));
  }
}