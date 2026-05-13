import { createRequire } from 'node:module';

import { getAuthStatus } from '../gmail/auth.js';
import { DraftService } from '../gmail/drafts.js';
import { LabelService } from '../gmail/labels.js';
import { MessageService } from '../gmail/messages.js';
import { StateService } from '../gmail/state.js';
import { ThreadService } from '../gmail/threads.js';
import { type ServerDependencies, type ServerDependencyOverrides } from './types.js';

const require = createRequire(import.meta.url);
const packageJson = require('../../package.json') as { version?: string };

export function createServerDependencies(
  overrides: ServerDependencyOverrides = {}
): ServerDependencies {
  return {
    adapterVersion: overrides.adapterVersion ?? packageJson.version ?? '0.0.0',
    getAuthStatus: overrides.getAuthStatus ?? getAuthStatus,
    labelService: overrides.labelService ?? (() => new LabelService()),
    messageService: overrides.messageService ?? (() => new MessageService()),
    threadService: overrides.threadService ?? (() => new ThreadService()),
    draftService: overrides.draftService ?? (() => new DraftService()),
    stateService: overrides.stateService ?? (() => new StateService()),
  };
}