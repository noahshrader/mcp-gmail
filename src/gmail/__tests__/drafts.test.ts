import { DraftService } from '../drafts.js';
import { createGmailClientStub, createMessage } from './test-helpers.js';

describe('DraftService', () => {
  it('returns preview for dry-run create draft', async () => {
    const service = new DraftService(async () => createGmailClientStub({}), async () => createGmailClientStub({}));
    const result = await service.createDraft(
      {
        to: ['person@example.com'],
        subject: 'Hello',
        body: 'Draft body'
      },
      true
    );

    expect(result).toEqual({
      dryRun: true,
      preview: {
        to: ['person@example.com'],
        cc: [],
        bcc: [],
        subject: 'Hello',
        body: 'Draft body',
        threadId: undefined,
        replyToMessageId: undefined
      }
    });
  });

  it('sends draft using preview-first flow', async () => {
    const composeClient = createGmailClientStub({
      users: {
        drafts: {
          get: async () => ({
            data: {
              id: 'draft-1',
              message: createMessage({
                payload: {
                  headers: [
                    { name: 'Subject', value: 'Hello' },
                    { name: 'To', value: 'person@example.com' }
                  ],
                  parts: [
                    {
                      mimeType: 'text/plain',
                      body: {
                        data: Buffer.from('Draft body').toString('base64url')
                      }
                    }
                  ]
                }
              })
            }
          })
        }
      } as never
    });
    const sendClient = createGmailClientStub({});
    const service = new DraftService(async () => composeClient, async () => sendClient);

    const result = await service.sendDraft('draft-1', false);

    expect(result.messageId).toBe('message-sent-1');
    expect(result.preview.subject).toBe('Hello');
  });

  it('creates reply draft preview from thread context', async () => {
    const composeClient = createGmailClientStub({
      users: {
        threads: {
          get: async () => ({
            data: {
              id: 'thread-1',
              messages: [
                createMessage({
                  payload: {
                    headers: [
                      { name: 'Subject', value: 'Project update' },
                      { name: 'From', value: 'sender@example.com' },
                      { name: 'Message-Id', value: '<message-id-1>' }
                    ],
                    parts: [
                      {
                        mimeType: 'text/plain',
                        body: {
                          data: Buffer.from('Body').toString('base64url')
                        }
                      }
                    ]
                  }
                })
              ]
            }
          })
        }
      } as never
    });
    const service = new DraftService(async () => composeClient, async () => createGmailClientStub({}));

    const result = await service.createReplyDraft('thread-1', { body: 'Reply body' }, true);

    expect(result.preview.subject).toBe('Re: Project update');
    expect(result.preview.replyToMessageId).toBe('<message-id-1>');
  });
});