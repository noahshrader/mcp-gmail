# OAUTH Permissions

mcp-gmail requests the minimum Gmail scopes required for the tools you use. This page explains what each scope allows, which tools depend on it, and what it cannot do.

## Scopes requested at first login

```
https://www.googleapis.com/auth/gmail.readonly
https://www.googleapis.com/auth/gmail.compose
https://www.googleapis.com/auth/gmail.send
https://www.googleapis.com/auth/gmail.modify
```

All four scopes are requested together during `auth login`. Gmail requires the full set to be granted in a single consent flow.

## Scope breakdown

### `gmail.readonly`

**Allows**: Reading messages, threads, labels, attachments, and mailbox metadata.  
**Does not allow**: Any modification — cannot archive, trash, mark read, create drafts, or send.

Tools that require this scope (and only this scope):

| Tool | What it reads |
|---|---|
| `gmail_search` | Message IDs and metadata matching a query |
| `gmail_read_message` | Full message body and headers |
| `gmail_read_thread` | All messages in a thread |
| `gmail_list_labels` | All user-created and system labels |
| `gmail_diagnostics` | Auth status and scope check |

---

### `gmail.compose`

**Allows**: Creating, reading, updating, and deleting drafts. Cannot send.  
**Does not allow**: Reading received messages or sending email.

Tools that require this scope:

| Tool | Operation |
|---|---|
| `gmail_create_draft` | Creates a new draft (default: `dryRun: true`) |
| `gmail_create_reply_draft` | Creates a reply draft in-thread (default: `dryRun: true`) |
| `gmail_update_draft` | Replaces draft content (default: `dryRun: true`) |

---

### `gmail.send`

**Allows**: Sending messages, including existing drafts.  
**Does not allow**: Reading or modifying any messages.

Tools that require this scope:

| Tool | Operation |
|---|---|
| `gmail_send_draft` | Sends an existing draft (default: `dryRun: true`) |

`gmail_send_draft` is the only tool that can put email into the world. It defaults to `dryRun: true` and **requires explicit `dryRun: false`** to actually send.

---

### `gmail.modify`

**Allows**: Everything `gmail.readonly` allows, plus archiving, trashing, marking read/unread, and applying/removing labels. Does not grant send access.

Tools that require this scope:

| Tool | Operation |
|---|---|
| `gmail_archive` | Removes the INBOX label (default: `dryRun: true`) |
| `gmail_trash` | Moves to Trash (default: `dryRun: true`) |
| `gmail_mark_read` | Removes UNREAD label (default: `dryRun: true`) |
| `gmail_mark_unread` | Adds UNREAD label (default: `dryRun: true`) |
| `gmail_apply_labels` | Adds one or more labels to a message (default: `dryRun: true`) |
| `gmail_remove_labels` | Removes one or more labels from a message (default: `dryRun: true`) |

---

## Scope storage

The granted scopes are encoded in the cached access token at `~/.gmail-mcp/token.json` (configurable via `GMAIL_MCP_TOKEN_PATH`). If you run `auth login` again, Google re-issues a token with the scopes you approve on that attempt.

## Revoking access

To revoke all access: visit [myaccount.google.com/permissions](https://myaccount.google.com/permissions), find the OAUTH app, and remove it. Then run `auth logout` locally to delete the cached token.

## Scope narrowing

If you only need read access, you can edit `src/gmail/scopes.ts` and remove the write scopes from the exported arrays. The server will only request the scopes you configure. Tools that require a broader scope will fail at the API level if those scopes were not granted.
