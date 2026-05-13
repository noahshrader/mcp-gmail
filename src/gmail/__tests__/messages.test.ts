import { MessageService } from '../messages.js';
import { createGmailClientStub, createMessage } from './test-helpers.js';

describe('MessageService', () => {
  it('searches messages with metadata hydration', async () => {
    const service = new MessageService(async () =>
      createGmailClientStub({
        users: {
          messages: {
            list: async () => ({
              data: { messages: [{ id: 'message-1' }, { id: 'message-2' }] }
            }),
            get: async ({ id }: { id?: string }) => ({
              data: createMessage({ id: id ?? 'unknown', threadId: `thread-${id}` })
            })
          }
        } as never
      })
    );

    const results = await service.searchMessages('in:inbox', { maxResults: 50 });

    expect(results).toHaveLength(2);
    expect(results[0]).toMatchObject({ id: 'message-1', subject: 'Test Subject' });
  });

  it('reads a single message with plain-text body', async () => {
    const service = new MessageService(async () => createGmailClientStub({}));
    const message = await service.getMessage('message-1');

    expect(message.textBody).toBe('Plain text body');
    expect(message.attachments).toEqual([]);
  });

  it('rejects overly long queries', async () => {
    const service = new MessageService(async () => createGmailClientStub({}));

    await expect(service.searchMessages('x'.repeat(501))).rejects.toThrow(
      'Search query cannot exceed 500 characters'
    );
  });
});