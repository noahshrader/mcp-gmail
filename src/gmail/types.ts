export interface Label {
  id: string;
  name: string;
  type: 'system' | 'user';
  messagesTotal?: number;
  messagesUnread?: number;
}

export interface SearchOptions {
  maxResults?: number;
  pageToken?: string;
  labelIds?: string[];
  includeSpamTrash?: boolean;
}

export interface MessageSummary {
  id: string;
  threadId: string;
  labelIds: string[];
  snippet?: string;
  subject?: string;
  from?: string;
  to: string[];
  cc: string[];
  bcc: string[];
  date?: string;
  internalDate?: string;
}

export interface AttachmentMetadata {
  filename: string;
  mimeType: string;
  size: number;
  attachmentId?: string;
  partId?: string;
  inline: boolean;
}

export interface MessageDetail extends MessageSummary {
  historyId?: string;
  textBody?: string;
  attachments: AttachmentMetadata[];
}

export interface ThreadSummary {
  id: string;
  historyId?: string;
  snippet?: string;
  messageCount: number;
}

export interface ThreadDetail extends ThreadSummary {
  messages: MessageDetail[];
}

export interface DraftPayload {
  to?: string[];
  subject?: string;
  body: string;
  cc?: string[];
  bcc?: string[];
  replyToMessageId?: string;
}

export interface DraftPreview {
  to: string[];
  cc: string[];
  bcc: string[];
  subject: string;
  body: string;
  threadId?: string;
  replyToMessageId?: string;
}



export interface DraftResult {
  draftId?: string;
  dryRun: boolean;
  preview: DraftPreview;
  threadId?: string;
}

export interface SendPreview {
  draftId: string;
  to: string[];
  cc: string[];
  bcc: string[];
  subject: string;
  body: string;
}

export interface SendResult {
  messageId?: string;
  draftId: string;
  dryRun: boolean;
  preview: SendPreview;
}

export type StateChange =
  | 'archive'
  | 'trash'
  | 'mark_read'
  | 'mark_unread'
  | 'apply_labels'
  | 'remove_labels';

export interface StateResult {
  id: string;
  action: StateChange;
  dryRun: boolean;
  labelIds?: string[];
}