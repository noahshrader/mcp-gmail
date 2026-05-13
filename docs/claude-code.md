# Claude Code

## Prerequisites

- `npm run build`
- `npm run cli auth login`

## Configure Claude Code

Add the Gmail MCP server to `.claude/settings.json` in the workspace or user settings:

```json
{
  "mcpServers": {
    "gmail": {
      "command": "node",
      "args": ["/absolute/path/to/mcp-gmail/dist/index.js"],
      "env": {
        "GMAIL_MCP_CREDENTIALS_PATH": "/Users/you/.gmail-mcp/credentials.json",
        "GMAIL_MCP_TOKEN_PATH": "/Users/you/.gmail-mcp/token.json"
      }
    }
  }
}
```

## Verification

1. Restart Claude Code or reload its MCP configuration.
2. Run `gmail_diagnostics`.
3. Run `gmail_search` with a narrow inbox query.
4. Run one dry-run write tool such as `gmail_archive` or `gmail_create_draft`.

## Troubleshooting

- If the server does not appear, confirm the JSON is valid and the `command` path resolves.
- If the process starts but tools fail, run the CLI auth flow separately to confirm the token is valid.
- If a token was issued before `gmail.modify` was requested, delete the token and log in again.