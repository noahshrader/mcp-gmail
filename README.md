# mcp-gmail

Local-first Gmail MCP server and CLI written in TypeScript. The Gmail adapter stays framework-agnostic; MCP and CLI are thin layers on top.

## Quick Start

```bash
npm install
npm run build
npm run cli auth login
```

After the OAuth flow completes, verify the adapter locally:

```bash
npm run cli labels list
npm run cli messages search "in:inbox" --max-results 5
npm run mcp
```

## OAuth Setup

1. Create a Google Cloud OAuth client for a desktop application.
2. Save the downloaded JSON at `~/.gmail-mcp/credentials.json`.
3. Run `npm run cli auth login`.
4. The adapter opens a browser, listens on a local `127.0.0.1` callback URL, and stores the token at `~/.gmail-mcp/token.json`.

Detailed setup and troubleshooting: [docs/oauth-setup.md](docs/oauth-setup.md)

## Tool Surface

| Tool | Purpose | Input | Output | Dry run |
|---|---|---|---|---|
| `gmail_diagnostics` | Auth and adapter health | none | auth state, scopes, token expiry, version | n/a |
| `gmail_list_labels` | List labels | none | `labels[]` | n/a |
| `gmail_search` | Search messages | `query`, `maxResults?`, `pageToken?` | `messages[]` | n/a |
| `gmail_read_message` | Read a message | `id`, `includeBody?` | `message` | n/a |
| `gmail_read_thread` | Read a thread | `id` | `thread` | n/a |
| `gmail_create_draft` | Create a draft | `to`, `subject`, `body`, `cc?`, `bcc?`, `dryRun?` | preview or created draft | default `true` |
| `gmail_update_draft` | Update a draft | `id`, `body`, `to?`, `subject?`, `cc?`, `bcc?`, `dryRun?` | preview or updated draft | default `true` |
| `gmail_send_draft` | Send a draft | `id`, `dryRun?` | preview or sent message | default `true` |
| `gmail_create_reply_draft` | Create a reply draft | `threadId`, `body`, `replyToMessageId?`, `to?`, `subject?`, `cc?`, `bcc?`, `dryRun?` | preview or created draft | default `true` |
| `gmail_archive` | Remove `INBOX` label | `id`, `dryRun?` | `id`, `action`, `dryRun` | default `true` |
| `gmail_mark_read` | Mark read | `id`, `dryRun?` | `id`, `action`, `dryRun` | default `true` |
| `gmail_mark_unread` | Mark unread | `id`, `dryRun?` | `id`, `action`, `dryRun` | default `true` |
| `gmail_apply_labels` | Add labels | `id`, `labelIds`, `dryRun?` | `id`, `appliedLabelIds`, `dryRun` | default `true` |
| `gmail_remove_labels` | Remove labels | `id`, `labelIds`, `dryRun?` | `id`, `removedLabelIds`, `dryRun` | default `true` |
| `gmail_trash` | Move to trash | `id`, `dryRun?` | `id`, `action`, `dryRun` | default `true` |

## Configuration

| Environment variable | Default | Purpose |
|---|---|---|
| `GMAIL_MCP_CREDENTIALS_PATH` | `~/.gmail-mcp/credentials.json` | OAuth client JSON downloaded from Google Cloud |
| `GMAIL_MCP_TOKEN_PATH` | `~/.gmail-mcp/token.json` | Saved OAuth access and refresh token |

## Validation

```bash
npm run build
npm test
npm run lint
npm run coverage
```

Current coverage baseline is above 80% overall and above 90% in `src/gmail/`.

## Client Guides

- [docs/claude-desktop.md](docs/claude-desktop.md)
- [docs/claude-code.md](docs/claude-code.md)
- [docs/github-copilot.md](docs/github-copilot.md)
- [docs/cursor.md](docs/cursor.md)