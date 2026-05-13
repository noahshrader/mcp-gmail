import { AttachmentService } from '../attachments.js';
import { createGmailClientStub, createMessage } from './test-helpers.js';

describe('AttachmentService', () => {
  it('returns attachment metadata without downloading bodies', async () => {
    const service = new AttachmentService(async () =>
      createGmailClientStub({
        users: {
          messages: {
            get: async () => ({
              data: createMessage({
                payload: {
                  headers: [],
                  parts: [
                    {
                      filename: 'invoice.pdf',
                      mimeType: 'application/pdf',
                      partId: '2',
                      body: {
                        size: 42,
                        attachmentId: 'attachment-1'
                      }
                    }
                  ]
                }
              })
            })
          }
        } as never
      })
    );

    await expect(service.listAttachmentMetadata('message-1')).resolves.toEqual([
      {
        filename: 'invoice.pdf',
        mimeType: 'application/pdf',
        size: 42,
        attachmentId: 'attachment-1',
        partId: '2',
        inline: false
      }
    ]);
  });
});