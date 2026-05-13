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
});