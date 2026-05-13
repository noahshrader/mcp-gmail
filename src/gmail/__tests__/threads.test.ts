import { ThreadService } from '../threads.js';
import { createGmailClientStub, createMessage } from './test-helpers.js';

describe('ThreadService', () => {
  it('reads a thread into message details', async () => {
    const service = new ThreadService(async () =>
      createGmailClientStub({
        users: {
          threads: {
            get: async () => ({
              data: {
                id: 'thread-1',
                historyId: 'history-1',
                snippet: 'hello',
                messages: [createMessage(), createMessage({ id: 'message-2' })]
              }
            })
          }
        } as never
      })
    );

    const thread = await service.getThread('thread-1');

    expect(thread.messageCount).toBe(2);
    expect(thread.messages[1].id).toBe('message-2');
  });
});