import { getGmailClient, type GmailClientFactory } from './client.js';
import { READONLY_SCOPES } from './scopes.js';
import {
  toMessageDetail,
  toMessageSummary
} from './transformers.js';
import type { AttachmentMetadata, MessageDetail, MessageSummary, SearchOptions } from './types.js';

export class MessageService {
  constructor(private readonly clientFactory: GmailClientFactory = () => getGmailClient(READONLY_SCOPES)) {}

  async searchMessages(query: string, options: SearchOptions = {}): Promise<MessageSummary[]> {
    const normalizedQuery = query.trim();

    if (!normalizedQuery) {
      throw new Error('Search query cannot be empty');
    }

    if (normalizedQuery.length > 500) {
      throw new Error('Search query cannot exceed 500 characters');
    }

    const maxResults = Math.min(options.maxResults ?? 20, 100);
    const gmail = await this.clientFactory();
    const response = await gmail.users.messages.list({
      userId: 'me',
      q: normalizedQuery,
      maxResults,
      pageToken: options.pageToken,
      labelIds: options.labelIds,
      includeSpamTrash: options.includeSpamTrash
    });

    const messages = response.data.messages ?? [];

    const detailedMessages = await Promise.all(
      messages.map(async (message) => {
        const detail = await gmail.users.messages.get({
          userId: 'me',
          id: message.id ?? '',
          format: 'metadata',
          metadataHeaders: ['Subject', 'From', 'To', 'Cc', 'Bcc', 'Date']
        });

        return toMessageSummary(detail.data);
      })
    );

    return detailedMessages;
  }

  async getMessage(id: string, includeBody = true): Promise<MessageDetail> {
    const gmail = await this.clientFactory();
    const response = await gmail.users.messages.get({
      userId: 'me',
      id,
      format: 'full'
    });

    return toMessageDetail(response.data, includeBody);
  }

  detectAttachments(message: MessageDetail): AttachmentMetadata[] {
    return message.attachments;
  }
}