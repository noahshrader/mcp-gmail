# System Overview

mcp-gmail is a [Model Context Protocol](https://modelcontextprotocol.io) server that gives AI agents structured, safe access to a Gmail account. It bridges any MCP-compatible client (Claude Desktop, Cursor, VS Code Copilot, Claude Code) to the Gmail API using standard OAuth 2.0 credentials — no third-party service, no API key sharing, all traffic goes directly between your machine and Google.

## What it does

The server exposes 15 tools covering four capability areas:

| Area | Tools |
|---|---|
| **Read** | `gmail_search`, `gmail_read_message`, `gmail_read_thread` |
| **Labels** | `gmail_list_labels`, `gmail_apply_labels`, `gmail_remove_labels` |
| **State** | `gmail_archive`, `gmail_mark_read`, `gmail_mark_unread`, `gmail_trash` |
| **Drafts** | `gmail_create_draft`, `gmail_update_draft`, `gmail_create_reply_draft`, `gmail_send_draft` |
| **Diagnostics** | `gmail_diagnostics` |

All write operations default to `dryRun: true` — the agent must explicitly pass `dryRun: false` to commit a change. This gives you a natural review point before anything is modified.

## How it connects

The server runs as a local stdio process. Your MCP client spawns it, communicates over stdin/stdout with JSON-RPC, and the server makes authenticated calls to the Gmail API on each tool invocation.

```
MCP Client  ──stdio──▶  mcp-gmail server  ──HTTPS──▶  Gmail API (Google)
                              │
                         ~/.gmail-mcp/
                         (token + credentials)
```

No persistent background process is needed. The server starts on demand and exits when the client disconnects.

## Authentication model

Credentials are stored at `~/.gmail-mcp/credentials.json` (the OAuth client JSON from Google Cloud Console). After the first `auth login` flow, an access token is cached at `~/.gmail-mcp/token.json` and automatically refreshed when it nears expiry. No credentials are transmitted outside your machine except to Google's OAuth and Gmail endpoints.

## Key design decisions

- **Adapter pattern**: Gmail services are injected via a factory function (`GmailClientFactory`). The MCP server and CLI never import `googleapis` directly — they work through the adapter. This makes every layer independently testable.
- **Dry-run by default**: All write tools default `dryRun: true`. Actual mutations require an explicit opt-in.
- **Typed error hierarchy**: All API errors are normalized to a stable `GmailErrorCode` string. Tool responses always include a `code` field alongside `error` so clients can handle errors programmatically.
- **Transparent retry + rate limiting**: Transient Gmail API failures (5xx, 429) are retried with exponential backoff. A token-bucket limiter caps throughput at 200 units/sec — safely below Gmail's 250/sec quota limit.
