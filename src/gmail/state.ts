import { getGmailClient, type GmailClientFactory } from './client.js';
import { GmailInvalidInputError } from './errors.js';
import { MODIFY_SCOPES } from './scopes.js';
import type { Label, StateResult } from './types.js';

const RESERVED_LABELS = new Set(['SENT', 'SPAM']);

export class StateService {
  constructor(
    private readonly clientFactory: GmailClientFactory = () => getGmailClient(MODIFY_SCOPES),
    private readonly labelLoader: () => Promise<Label[]> = async () => {
      const gmail = await this.clientFactory();
      const response = await gmail.users.labels.list({ userId: 'me' });
      return (response.data.labels ?? []).map((label) => ({
        id: label.id ?? '',
        name: label.name ?? '',
        type: (label.type?.toLowerCase() === 'system' ? 'system' : 'user') as Label['type']
      }));
    }
  ) {}

  async archiveMessage(id: string, dryRun = true): Promise<StateResult> {
    if (!dryRun) {
      const gmail = await this.clientFactory();
      await gmail.users.messages.modify({
        userId: 'me',
        id,
        requestBody: { removeLabelIds: ['INBOX'] }
      });
    }

    return { id, action: 'archive', dryRun };
  }

  async trashMessage(id: string, dryRun = true): Promise<StateResult> {
    if (!dryRun) {
      const gmail = await this.clientFactory();
      await gmail.users.messages.trash({ userId: 'me', id });
    }

    return { id, action: 'trash', dryRun };
  }

  async markRead(id: string, dryRun = true): Promise<StateResult> {
    if (!dryRun) {
      const gmail = await this.clientFactory();
      await gmail.users.messages.modify({
        userId: 'me',
        id,
        requestBody: { removeLabelIds: ['UNREAD'] }
      });
    }

    return { id, action: 'mark_read', dryRun };
  }

  async markUnread(id: string, dryRun = true): Promise<StateResult> {
    if (!dryRun) {
      const gmail = await this.clientFactory();
      await gmail.users.messages.modify({
        userId: 'me',
        id,
        requestBody: { addLabelIds: ['UNREAD'] }
      });
    }

    return { id, action: 'mark_unread', dryRun };
  }

  async applyLabels(id: string, labelIds: string[], dryRun = true): Promise<StateResult> {
    await this.assertLabelsExist(labelIds);

    if (!dryRun) {
      const gmail = await this.clientFactory();
      await gmail.users.messages.modify({
        userId: 'me',
        id,
        requestBody: { addLabelIds: labelIds }
      });
    }

    return { id, action: 'apply_labels', dryRun, labelIds };
  }

  async removeLabels(id: string, labelIds: string[], dryRun = true): Promise<StateResult> {
    const forbidden = labelIds.filter((labelId) => RESERVED_LABELS.has(labelId));

    if (forbidden.length > 0) {
      throw new GmailInvalidInputError(
        `Refusing to remove reserved system labels: ${forbidden.join(', ')}`
      );
    }

    await this.assertLabelsExist(labelIds);

    if (!dryRun) {
      const gmail = await this.clientFactory();
      await gmail.users.messages.modify({
        userId: 'me',
        id,
        requestBody: { removeLabelIds: labelIds }
      });
    }

    return { id, action: 'remove_labels', dryRun, labelIds };
  }

  private async assertLabelsExist(labelIds: string[]): Promise<void> {
    const existingLabels = new Set((await this.labelLoader()).map((label) => label.id));
    const missingLabels = labelIds.filter((labelId) => !existingLabels.has(labelId));

    if (missingLabels.length > 0) {
      throw new GmailInvalidInputError(`Unknown label IDs: ${missingLabels.join(', ')}`);
    }
  }
}