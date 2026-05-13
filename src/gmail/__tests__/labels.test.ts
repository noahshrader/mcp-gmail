import { LabelService } from '../labels.js';
import { createGmailClientStub } from './test-helpers.js';

describe('LabelService', () => {
  it('lists labels', async () => {
    const service = new LabelService(async () =>
      createGmailClientStub({
        users: {
          labels: {
            list: async () => ({
              data: {
                labels: [
                  { id: 'INBOX', name: 'INBOX', type: 'system', messagesUnread: 2 },
                  { id: 'Label_1', name: 'Project', type: 'user', messagesTotal: 5 }
                ]
              }
            })
          }
        } as never
      })
    );

    await expect(service.listLabels()).resolves.toEqual([
      {
        id: 'INBOX',
        name: 'INBOX',
        type: 'system',
        messagesTotal: undefined,
        messagesUnread: 2
      },
      {
        id: 'Label_1',
        name: 'Project',
        type: 'user',
        messagesTotal: 5,
        messagesUnread: undefined
      }
    ]);
  });
});