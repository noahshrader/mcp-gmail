export const GMAIL_SCOPES = {
  readonly: 'https://www.googleapis.com/auth/gmail.readonly',
  compose: 'https://www.googleapis.com/auth/gmail.compose',
  send: 'https://www.googleapis.com/auth/gmail.send',
  modify: 'https://www.googleapis.com/auth/gmail.modify'
} as const;

export const READONLY_SCOPES = [GMAIL_SCOPES.readonly];
export const COMPOSE_SCOPES = [GMAIL_SCOPES.compose];
export const SEND_SCOPES = [GMAIL_SCOPES.send];
export const MODIFY_SCOPES = [GMAIL_SCOPES.modify];