# Risks and Limitations

## Safety constraints

### Dry-run defaults

All write tools default to `dryRun: true`. When an agent calls a write tool without explicitly setting `dryRun: false`, the tool returns a preview of what would happen but makes no changes.

**Risk**: An agent can request `dryRun: false`. If you approve a tool call without reviewing its arguments, real changes will be made. Emails can be sent, messages trashed, labels modified — with no undo in some cases (`gmail_send_draft` with `dryRun: false` sends immediately).

**Mitigation**: Review any tool call that includes `"dryRun": false` before approving it. Your MCP client should display the full argument payload before executing.

### No recycle bin for sent email

Gmail drafts can be deleted or restored. Sent email cannot be unsent. Once `gmail_send_draft` succeeds with `dryRun: false`, the email is delivered.

### Trash is reversible; permanent delete is not

`gmail_trash` moves messages to Trash, which Gmail auto-empties after 30 days. There is no `gmail_permanently_delete` tool — that operation is intentionally excluded.

---

## Authentication and credential security

### Credentials file

`~/.gmail-mcp/credentials.json` contains your OAUTH client ID and secret. This file is created by you from the Google Cloud Console and is never transmitted anywhere. Protect it like any private key: readable only by your user account, not checked into version control.

### Token file

`~/.gmail-mcp/token.json` is the cached OAUTH token. It grants Gmail access without requiring your Google password. If this file is compromised, an attacker can access your Gmail account until the token expires or you revoke access at [myaccount.google.com/permissions](https://myaccount.google.com/permissions).

**Recommended permissions**: `chmod 600 ~/.gmail-mcp/token.json ~/.gmail-mcp/credentials.json`

---

## Rate limits and quotas

### Gmail API quota

Gmail's default quota is 250 quota units/second and 1,000,000 units/day per project. The server's token-bucket limiter caps throughput at 200 units/second, providing a 20% safety margin against hitting the per-second ceiling.

Quota unit costs vary by operation. A `messages.list` costs 5 units; a `messages.get` costs 5; a `messages.send` costs 100. Bulk operations (searching large mailboxes, reading many messages) can exhaust daily quota if used at high volume.

### Rate limit behavior

When the Gmail API returns HTTP 429 or a `rateLimitExceeded` error, the server retries automatically with exponential backoff (up to 3 attempts, 8-second max delay). If all retries fail, the tool returns an error with `code: "gmail/rate_limited"`.

---

## Functional limitations

### Single account per server instance

Each running server instance is bound to one set of credentials. To use multiple Gmail accounts, run multiple server instances with different `GMAIL_MCP_CREDENTIALS_PATH` and `GMAIL_MCP_TOKEN_PATH` environment variables.

### No attachment upload

`gmail_create_draft` and `gmail_create_reply_draft` accept plain-text and HTML bodies. Sending attachments is not supported by the current tools. The Gmail API supports multipart messages, but this capability has not been implemented.

### Message body size

`gmail_read_message` returns the full decoded body. For very large emails (multi-megabyte attachments embedded as base64), this can produce large MCP responses. The tool does not paginate or truncate body content.

### Search query limits

`gmail_search` supports standard Gmail search operators (from:, to:, subject:, has:attachment, etc.). The maximum query length is 500 characters. Complex boolean queries work, but very broad queries (e.g., `in:all`) may time out on large mailboxes.

### Label ID vs label name

Gmail API operations use label IDs, not display names. `gmail_apply_labels` and `gmail_remove_labels` require label IDs (e.g., `Label_12345` or `INBOX`). Use `gmail_list_labels` first to look up the correct ID if you only know the display name.

---

## Deferred features

The following capabilities are designed but not yet implemented:

| Feature | Status | Notes |
|---|---|---|
| **Skills** (Phase 4) | Deferred | Markdown workflow descriptions for agent discovery. Not required for core functionality. |
| **Run history** (Phase 5) | Deferred | Local JSON log of tool invocations for auditability. |
| **Workflow preview** (Phase 6) | Deferred | Depends on Phase 4; allows agents to preview multi-step plans. |

The server functions fully without these phases. They can be implemented later without changes to the existing adapter or server structure.
