import type { AuthStatus } from '../gmail/auth.js';
import { DraftService } from '../gmail/drafts.js';
import { LabelService } from '../gmail/labels.js';
import { MessageService } from '../gmail/messages.js';
import { StateService } from '../gmail/state.js';
import { ThreadService } from '../gmail/threads.js';

export interface LabelServiceApi {
  listLabels(): ReturnType<LabelService['listLabels']>;
}

export interface MessageServiceApi {
  searchMessages(...args: Parameters<MessageService['searchMessages']>): ReturnType<MessageService['searchMessages']>;
  getMessage(...args: Parameters<MessageService['getMessage']>): ReturnType<MessageService['getMessage']>;
}

export interface ThreadServiceApi {
  getThread(...args: Parameters<ThreadService['getThread']>): ReturnType<ThreadService['getThread']>;
}

export interface DraftServiceApi {
  createDraft(...args: Parameters<DraftService['createDraft']>): ReturnType<DraftService['createDraft']>;
  updateDraft(...args: Parameters<DraftService['updateDraft']>): ReturnType<DraftService['updateDraft']>;
  sendDraft(...args: Parameters<DraftService['sendDraft']>): ReturnType<DraftService['sendDraft']>;
  createReplyDraft(...args: Parameters<DraftService['createReplyDraft']>): ReturnType<DraftService['createReplyDraft']>;
}

export interface StateServiceApi {
  archiveMessage(...args: Parameters<StateService['archiveMessage']>): ReturnType<StateService['archiveMessage']>;
  trashMessage(...args: Parameters<StateService['trashMessage']>): ReturnType<StateService['trashMessage']>;
  markRead(...args: Parameters<StateService['markRead']>): ReturnType<StateService['markRead']>;
  markUnread(...args: Parameters<StateService['markUnread']>): ReturnType<StateService['markUnread']>;
  applyLabels(...args: Parameters<StateService['applyLabels']>): ReturnType<StateService['applyLabels']>;
  removeLabels(...args: Parameters<StateService['removeLabels']>): ReturnType<StateService['removeLabels']>;
}

export interface ServerDependencies {
  adapterVersion: string;
  getAuthStatus: (scopes?: string[]) => Promise<AuthStatus>;
  labelService: () => LabelServiceApi;
  messageService: () => MessageServiceApi;
  threadService: () => ThreadServiceApi;
  draftService: () => DraftServiceApi;
  stateService: () => StateServiceApi;
}

export type ServerDependencyOverrides = Partial<ServerDependencies>;