import { vi } from 'vitest';

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

  it('uses an explicit reply target when replyToMessageId is provided', async () => {
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
                      { name: 'Subject', value: 'First update' },
                      { name: 'From', value: 'first@example.com' },
                      { name: 'Message-Id', value: '<message-id-1>' }
                    ],
                    parts: [
                      {
                        mimeType: 'text/plain',
                        body: {
                          data: Buffer.from('First body').toString('base64url')
                        }
                      }
                    ]
                  }
                }),
                createMessage({
                  payload: {
                    headers: [
                      { name: 'Subject', value: 'Second update' },
                      { name: 'From', value: 'second@example.com' },
                      { name: 'Message-Id', value: '<message-id-2>' }
                    ],
                    parts: [
                      {
                        mimeType: 'text/plain',
                        body: {
                          data: Buffer.from('Second body').toString('base64url')
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

    const result = await service.createReplyDraft(
      'thread-1',
      { body: 'Reply body', replyToMessageId: '<message-id-1>' },
      true
    );

    expect(result.preview.to).toEqual(['first@example.com']);
    expect(result.preview.subject).toBe('Re: First update');
    expect(result.preview.replyToMessageId).toBe('<message-id-1>');
  });

  it('creates and updates drafts when dryRun is false', async () => {
    const create = vi.fn().mockResolvedValue({
      data: { id: 'draft-2', message: { threadId: 'thread-2' } },
    });
    const update = vi.fn().mockResolvedValue({
      data: { id: 'draft-2', message: { threadId: 'thread-2' } },
    });
    const get = vi.fn().mockResolvedValue({
      data: {
        id: 'draft-2',
        message: createMessage({
          threadId: 'thread-2',
          payload: {
            headers: [
              { name: 'Subject', value: 'Existing subject' },
              { name: 'To', value: 'person@example.com' },
              { name: 'Cc', value: 'cc@example.com' },
            ],
            parts: [
              {
                mimeType: 'text/plain',
                body: {
                  data: Buffer.from('Existing body').toString('base64url'),
                },
              },
            ],
          },
        }),
      },
    });
    const composeClient = createGmailClientStub({
      users: {
        drafts: {
          create,
          get,
          update,
        },
      } as never,
    });
    const service = new DraftService(async () => composeClient, async () => createGmailClientStub({}));

    await expect(
      service.createDraft({ to: ['person@example.com'], subject: 'Hello', body: 'Draft body' }, false)
    ).resolves.toMatchObject({ draftId: 'draft-2', dryRun: false, threadId: 'thread-2' });

    await expect(service.updateDraft('draft-2', { body: 'Updated body' }, false)).resolves.toMatchObject({
      draftId: 'draft-2',
      dryRun: false,
      threadId: 'thread-2',
      preview: {
        to: ['person@example.com'],
        cc: ['cc@example.com'],
        bcc: [],
        subject: 'Existing subject',
        body: 'Updated body',
      },
    });

    expect(create).toHaveBeenCalledOnce();
    expect(update).toHaveBeenCalledOnce();
  });

  it('creates a reply draft when dryRun is false', async () => {
    const create = vi.fn().mockResolvedValue({ data: { id: 'draft-3' } });
    const composeClient = createGmailClientStub({
      users: {
        drafts: {
          create,
        },
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
                      { name: 'Message-Id', value: '<message-id-1>' },
                    ],
                    parts: [
                      {
                        mimeType: 'text/plain',
                        body: {
                          data: Buffer.from('Body').toString('base64url'),
                        },
                      },
                    ],
                  },
                }),
              ],
            },
          }),
        },
      } as never,
    });
    const service = new DraftService(async () => composeClient, async () => createGmailClientStub({}));

    await expect(service.createReplyDraft('thread-1', { body: 'Reply body' }, false)).resolves.toMatchObject({
      draftId: 'draft-3',
      dryRun: false,
      threadId: 'thread-1',
    });
    expect(create).toHaveBeenCalledOnce();
  });

  it('fails when a reply target cannot be resolved', async () => {
    const composeClient = createGmailClientStub({
      users: {
        threads: {
          get: async () => ({ data: { id: 'thread-1', messages: [] } }),
        },
      } as never,
    });
    const service = new DraftService(async () => composeClient, async () => createGmailClientStub({}));

    await expect(service.createReplyDraft('thread-1', { body: 'Reply body' }, true)).rejects.toThrow(
      'Thread thread-1 does not contain any messages'
    );
  });
});