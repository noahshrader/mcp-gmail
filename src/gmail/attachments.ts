import { getGmailClient, type GmailClientFactory } from './client.js';
import { READONLY_SCOPES } from './scopes.js';
import { extractAttachmentMetadata } from './transformers.js';
import type { AttachmentMetadata } from './types.js';

export class AttachmentService {
  constructor(private readonly clientFactory: GmailClientFactory = () => getGmailClient(READONLY_SCOPES)) {}

  async listAttachmentMetadata(messageId: string): Promise<AttachmentMetadata[]> {
    const gmail = await this.clientFactory();
    const response = await gmail.users.messages.get({
      userId: 'me',
      id: messageId,
      format: 'full'
    });

    return extractAttachmentMetadata(response.data.payload);
  }
}