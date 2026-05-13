import { getGmailClient, type GmailClientFactory } from './client.js';
import { COMPOSE_SCOPES, SEND_SCOPES } from './scopes.js';
import {
  buildRawMimeMessage,
  draftPreviewFromPayload,
  ensureReplySubject,
  extractMessageId,
  sendPreviewFromDraft,
  toMessageDetail
} from './transformers.js';
import type { DraftPayload, DraftPreview, DraftResult, SendPreview, SendResult } from './types.js';

export class DraftService {
  constructor(
    private readonly composeClientFactory: GmailClientFactory = () => getGmailClient(COMPOSE_SCOPES),
    private readonly sendClientFactory: GmailClientFactory = () => getGmailClient(SEND_SCOPES)
  ) {}

  async createDraft(payload: DraftPayload, dryRun = true): Promise<DraftResult> {
    const preview = draftPreviewFromPayload(payload);

    if (dryRun) {
      return { dryRun: true, preview };
    }

    const gmail = await this.composeClientFactory();
    const response = await gmail.users.drafts.create({
      userId: 'me',
      requestBody: {
        message: {
          raw: buildRawMimeMessage(preview)
        }
      }
    });

    return {
      draftId: response.data.id ?? undefined,
      dryRun: false,
      preview,
      threadId: response.data.message?.threadId ?? undefined
    };
  }

  async updateDraft(id: string, payload: DraftPayload, dryRun = true): Promise<DraftResult> {
    const gmail = await this.composeClientFactory();
    const currentDraft = await gmail.users.drafts.get({ userId: 'me', id, format: 'full' });
    const currentMessage = toMessageDetail(currentDraft.data.message ?? {});
    const mergedPreview: DraftPreview = {
      to: payload.to ?? currentMessage.to,
      cc: payload.cc ?? currentMessage.cc,
      bcc: payload.bcc ?? currentMessage.bcc,
      subject: payload.subject ?? currentMessage.subject ?? '',
      body: payload.body,
      threadId: currentDraft.data.message?.threadId ?? undefined
    };

    if (dryRun) {
      return { draftId: id, dryRun: true, preview: mergedPreview, threadId: mergedPreview.threadId };
    }

    const response = await gmail.users.drafts.update({
      userId: 'me',
      id,
      requestBody: {
        id,
        message: {
          threadId: mergedPreview.threadId,
          raw: buildRawMimeMessage(mergedPreview)
        }
      }
    });

    return {
      draftId: response.data.id ?? id,
      dryRun: false,
      preview: mergedPreview,
      threadId: response.data.message?.threadId ?? mergedPreview.threadId
    };
  }

  async sendDraft(id: string, dryRun = true): Promise<SendResult> {
    const preview = await this.fetchSendPreview(id);

    if (dryRun) {
      return { draftId: id, dryRun: true, preview };
    }

    const gmail = await this.sendClientFactory();
    const response = await gmail.users.drafts.send({
      userId: 'me',
      requestBody: { id }
    });

    return {
      draftId: id,
      messageId: response.data.id ?? undefined,
      dryRun: false,
      preview
    };
  }

  private async fetchSendPreview(id: string): Promise<SendPreview> {
    const gmail = await this.composeClientFactory();
    const draft = await gmail.users.drafts.get({ userId: 'me', id, format: 'full' });
    const detail = toMessageDetail(draft.data.message ?? {});

    return sendPreviewFromDraft(id, {
      to: detail.to,
      cc: detail.cc,
      bcc: detail.bcc,
      subject: detail.subject ?? '',
      body: detail.textBody ?? '',
      threadId: detail.threadId
    });
  }

  async createReplyDraft(threadId: string, payload: DraftPayload, dryRun = true): Promise<DraftResult> {
    const gmail = await this.composeClientFactory();
    const thread = await gmail.users.threads.get({ userId: 'me', id: threadId, format: 'full' });
    const threadMessages = thread.data.messages ?? [];
    const targetMessage = payload.replyToMessageId
      ? threadMessages.find(
          (message) => extractMessageId(message.payload) === payload.replyToMessageId
        )
      : threadMessages[threadMessages.length - 1];

    if (!targetMessage) {
      throw new Error(`Thread ${threadId} does not contain any messages`);
    }

    const lastMessageDetail = toMessageDetail(targetMessage);
    const preview: DraftPreview = {
      to: payload.to ?? (lastMessageDetail.from ? [lastMessageDetail.from] : []),
      cc: payload.cc ?? [],
      bcc: payload.bcc ?? [],
      subject: payload.subject ?? ensureReplySubject(lastMessageDetail.subject),
      body: payload.body,
      threadId,
      replyToMessageId: payload.replyToMessageId ?? extractMessageId(targetMessage.payload)
    };

    if (dryRun) {
      return { dryRun: true, preview, threadId };
    }

    const response = await gmail.users.drafts.create({
      userId: 'me',
      requestBody: {
        message: {
          threadId,
          raw: buildRawMimeMessage(preview)
        }
      }
    });

    return {
      draftId: response.data.id ?? undefined,
      dryRun: false,
      preview,
      threadId
    };
  }
}