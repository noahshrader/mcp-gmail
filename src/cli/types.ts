import { authorize, getAuthStatus, getTokenPath, type AuthStatus } from '../gmail/auth.js';
import { DraftService } from '../gmail/drafts.js';
import { LabelService } from '../gmail/labels.js';
import { MessageService } from '../gmail/messages.js';
import { ThreadService } from '../gmail/threads.js';

export interface CliIo {
  stdout: (text: string) => void;
  stderr: (text: string) => void;
}

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

export interface CliDependencies extends CliIo {
  authorize: typeof authorize;
  getAuthStatus: (scopes?: string[]) => Promise<AuthStatus>;
  getTokenPath: typeof getTokenPath;
  labelService: () => LabelServiceApi;
  messageService: () => MessageServiceApi;
  threadService: () => ThreadServiceApi;
  draftService: () => DraftServiceApi;
}

export function createCliDependencies(overrides: Partial<CliDependencies> = {}): CliDependencies {
  return {
    stdout: overrides.stdout ?? ((text: string) => process.stdout.write(text)),
    stderr: overrides.stderr ?? ((text: string) => process.stderr.write(text)),
    authorize: overrides.authorize ?? authorize,
    getAuthStatus: overrides.getAuthStatus ?? getAuthStatus,
    getTokenPath: overrides.getTokenPath ?? getTokenPath,
    labelService: overrides.labelService ?? (() => new LabelService()),
    messageService: overrides.messageService ?? (() => new MessageService()),
    threadService: overrides.threadService ?? (() => new ThreadService()),
    draftService: overrides.draftService ?? (() => new DraftService()),
  };
}