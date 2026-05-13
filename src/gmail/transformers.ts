import { gmail_v1 } from 'googleapis';

import type {
  AttachmentMetadata,
  DraftPayload,
  DraftPreview,
  MessageDetail,
  MessageSummary,
  SendPreview,
  ThreadDetail
} from './types.js';

type MessagePart = gmail_v1.Schema$MessagePart;

function headerValue(payload: MessagePart | undefined, headerName: string): string | undefined {
  return (
    payload?.headers?.find((header) => header.name?.toLowerCase() === headerName.toLowerCase())
      ?.value ?? undefined
  );
}

function splitAddresses(value: string | undefined): string[] {
  if (!value) {
    return [];
  }

  return value
    .split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export function decodeBase64Url(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  const paddedValue = value.replace(/-/g, '+').replace(/_/g, '/');
  return Buffer.from(paddedValue, 'base64').toString('utf8');
}

function stripHtml(value: string): string {
  return value
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/\r/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

function walkParts(payload: MessagePart | undefined, visit: (part: MessagePart) => void): void {
  if (!payload) {
    return;
  }

  visit(payload);

  for (const part of payload.parts ?? []) {
    walkParts(part, visit);
  }
}

function findBodyByMimeType(payload: MessagePart | undefined, mimeType: string): string | undefined {
  let body: string | undefined;

  walkParts(payload, (part) => {
    if (!body && part.mimeType === mimeType && part.body?.data) {
      body = decodeBase64Url(part.body.data);
    }
  });

  return body;
}

export function extractTextBody(payload: MessagePart | undefined): string | undefined {
  const plainTextBody = findBodyByMimeType(payload, 'text/plain');

  if (plainTextBody) {
    return plainTextBody.trim();
  }

  const htmlBody = findBodyByMimeType(payload, 'text/html');
  return htmlBody ? stripHtml(htmlBody) : undefined;
}

export function extractAttachmentMetadata(payload: MessagePart | undefined): AttachmentMetadata[] {
  const attachments: AttachmentMetadata[] = [];

  walkParts(payload, (part) => {
    const filename = part.filename?.trim();

    if (!filename) {
      return;
    }

    attachments.push({
      filename,
      mimeType: part.mimeType ?? 'application/octet-stream',
      size: part.body?.size ?? 0,
      attachmentId: part.body?.attachmentId ?? undefined,
      partId: part.partId ?? undefined,
      inline: Boolean(headerValue(part, 'Content-ID'))
    });
  });

  return attachments;
}

export function extractMessageId(payload: MessagePart | undefined): string | undefined {
  return headerValue(payload, 'Message-Id');
}

export function toMessageSummary(message: gmail_v1.Schema$Message): MessageSummary {
  const payload = message.payload;

  return {
    id: message.id ?? '',
    threadId: message.threadId ?? '',
    labelIds: message.labelIds ?? [],
    snippet: message.snippet ?? undefined,
    subject: headerValue(payload, 'Subject'),
    from: headerValue(payload, 'From'),
    to: splitAddresses(headerValue(payload, 'To')),
    cc: splitAddresses(headerValue(payload, 'Cc')),
    bcc: splitAddresses(headerValue(payload, 'Bcc')),
    date: headerValue(payload, 'Date'),
    internalDate: message.internalDate ?? undefined
  };
}

export function toMessageDetail(
  message: gmail_v1.Schema$Message,
  includeBody = true
): MessageDetail {
  return {
    ...toMessageSummary(message),
    historyId: message.historyId ?? undefined,
    textBody: includeBody ? extractTextBody(message.payload) : undefined,
    attachments: extractAttachmentMetadata(message.payload)
  };
}

export function toThreadDetail(thread: gmail_v1.Schema$Thread): ThreadDetail {
  const messages = (thread.messages ?? []).map((message) => toMessageDetail(message));

  return {
    id: thread.id ?? '',
    historyId: thread.historyId ?? undefined,
    snippet: thread.snippet ?? undefined,
    messageCount: messages.length,
    messages
  };
}

export function draftPreviewFromPayload(payload: DraftPayload & { threadId?: string; replyToMessageId?: string }): DraftPreview {
  return {
    to: payload.to ?? [],
    cc: payload.cc ?? [],
    bcc: payload.bcc ?? [],
    subject: payload.subject ?? '',
    body: payload.body,
    threadId: payload.threadId,
    replyToMessageId: payload.replyToMessageId
  };
}

export function sendPreviewFromDraft(draftId: string, preview: DraftPreview): SendPreview {
  return {
    draftId,
    to: preview.to,
    cc: preview.cc,
    bcc: preview.bcc,
    subject: preview.subject,
    body: preview.body
  };
}

export function buildRawMimeMessage(preview: DraftPreview): string {
  const lines = [
    `To: ${preview.to.join(', ')}`,
    ...(preview.cc.length ? [`Cc: ${preview.cc.join(', ')}`] : []),
    ...(preview.bcc.length ? [`Bcc: ${preview.bcc.join(', ')}`] : []),
    `Subject: ${preview.subject}`,
    'Content-Type: text/plain; charset="UTF-8"',
    'MIME-Version: 1.0',
    ...(preview.replyToMessageId ? [`In-Reply-To: ${preview.replyToMessageId}`] : []),
    ...(preview.replyToMessageId ? [`References: ${preview.replyToMessageId}`] : []),
    '',
    preview.body
  ];

  return Buffer.from(lines.join('\r\n'))
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

export function ensureReplySubject(subject: string | undefined): string {
  const trimmed = (subject ?? '').trim();

  if (!trimmed) {
    return 'Re:';
  }

  return /^re:/i.test(trimmed) ? trimmed : `Re: ${trimmed}`;
}