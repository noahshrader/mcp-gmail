import { vi } from 'vitest';

import { StateService } from '../state.js';
import { createGmailClientStub } from './test-helpers.js';

describe('StateService', () => {
  it('validates labels before applying them', async () => {
    const service = new StateService(
      async () => createGmailClientStub({}),
      async () => [
        { id: 'Label_1', name: 'Project', type: 'user' },
        { id: 'INBOX', name: 'Inbox', type: 'system' }
      ]
    );

    await expect(service.applyLabels('message-1', ['Label_1'], true)).resolves.toEqual({
      id: 'message-1',
      action: 'apply_labels',
      dryRun: true,
      labelIds: ['Label_1']
    });
  });

  it('rejects reserved labels during remove', async () => {
    const service = new StateService(async () => createGmailClientStub({}), async () => []);

    await expect(service.removeLabels('message-1', ['SENT'], true)).rejects.toThrow(
      'Refusing to remove reserved system labels: SENT'
    );
  });

  it('applies message state changes when dryRun is false', async () => {
    const modify = vi.fn().mockResolvedValue({ data: {} });
    const trash = vi.fn().mockResolvedValue({ data: {} });
    const service = new StateService(
      async () =>
        createGmailClientStub({
          users: {
            messages: {
              modify,
              trash,
            },
          } as never,
        }),
      async () => [
        { id: 'Label_1', name: 'Project', type: 'user' },
        { id: 'INBOX', name: 'Inbox', type: 'system' },
      ]
    );

    await expect(service.archiveMessage('message-1', false)).resolves.toEqual({
      id: 'message-1',
      action: 'archive',
      dryRun: false,
    });
    await expect(service.markRead('message-1', false)).resolves.toEqual({
      id: 'message-1',
      action: 'mark_read',
      dryRun: false,
    });
    await expect(service.markUnread('message-1', false)).resolves.toEqual({
      id: 'message-1',
      action: 'mark_unread',
      dryRun: false,
    });
    await expect(service.applyLabels('message-1', ['Label_1'], false)).resolves.toEqual({
      id: 'message-1',
      action: 'apply_labels',
      dryRun: false,
      labelIds: ['Label_1'],
    });
    await expect(service.removeLabels('message-1', ['Label_1'], false)).resolves.toEqual({
      id: 'message-1',
      action: 'remove_labels',
      dryRun: false,
      labelIds: ['Label_1'],
    });
    await expect(service.trashMessage('message-1', false)).resolves.toEqual({
      id: 'message-1',
      action: 'trash',
      dryRun: false,
    });

    expect(modify).toHaveBeenCalledWith({
      userId: 'me',
      id: 'message-1',
      requestBody: { removeLabelIds: ['INBOX'] },
    });
    expect(modify).toHaveBeenCalledWith({
      userId: 'me',
      id: 'message-1',
      requestBody: { removeLabelIds: ['UNREAD'] },
    });
    expect(modify).toHaveBeenCalledWith({
      userId: 'me',
      id: 'message-1',
      requestBody: { addLabelIds: ['UNREAD'] },
    });
    expect(modify).toHaveBeenCalledWith({
      userId: 'me',
      id: 'message-1',
      requestBody: { addLabelIds: ['Label_1'] },
    });
    expect(modify).toHaveBeenCalledWith({
      userId: 'me',
      id: 'message-1',
      requestBody: { removeLabelIds: ['Label_1'] },
    });
    expect(trash).toHaveBeenCalledWith({ userId: 'me', id: 'message-1' });
  });

  it('rejects unknown labels', async () => {
    const service = new StateService(
      async () => createGmailClientStub({}),
      async () => [{ id: 'Label_1', name: 'Project', type: 'user' }]
    );

    await expect(service.applyLabels('message-1', ['missing'], true)).rejects.toThrow(
      'Unknown label IDs: missing'
    );
  });
});