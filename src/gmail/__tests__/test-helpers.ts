import { gmail_v1 } from 'googleapis';

export function createMessage(overrides: Partial<gmail_v1.Schema$Message> = {}): gmail_v1.Schema$Message {
  return {
    id: 'message-1',
    threadId: 'thread-1',
    labelIds: ['INBOX'],
    snippet: 'Hello there',
    payload: {
      headers: [
        { name: 'Subject', value: 'Test Subject' },
        { name: 'From', value: 'sender@example.com' },
        { name: 'To', value: 'receiver@example.com' },
        { name: 'Date', value: 'Wed, 01 Jan 2025 00:00:00 +0000' }
      ],
      mimeType: 'multipart/alternative',
      parts: [
        {
          mimeType: 'text/plain',
          body: {
            data: Buffer.from('Plain text body').toString('base64url')
          }
        }
      ]
    },
    ...overrides
  };
}

export function createGmailClientStub(overrides: Partial<gmail_v1.Gmail>): gmail_v1.Gmail {
  return {
    users: {
      labels: {
        list: async () => ({ data: { labels: [] } })
      },
      messages: {
        list: async () => ({ data: { messages: [] } }),
        get: async () => ({ data: createMessage() }),
        modify: async () => ({ data: {} }),
        trash: async () => ({ data: {} })
      },
      threads: {
        get: async () => ({ data: { id: 'thread-1', messages: [createMessage()] } })
      },
      drafts: {
        create: async () => ({ data: { id: 'draft-1', message: { threadId: 'thread-1' } } }),
        get: async () => ({ data: { id: 'draft-1', message: createMessage() } }),
        update: async () => ({ data: { id: 'draft-1', message: { threadId: 'thread-1' } } }),
        send: async () => ({ data: { id: 'message-sent-1' } })
      }
    },
    ...overrides
  } as unknown as gmail_v1.Gmail;
}