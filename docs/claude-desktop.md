# Claude Desktop

## Prerequisites

- Build completed with `npm run build`
- OAUTH login completed with `npm run cli auth login`

## Configure Claude Desktop

Edit `~/Library/Application Support/Claude/claude_desktop_config.json` and add:

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

1. Restart Claude Desktop.
2. Call `gmail_diagnostics`.
3. Call `gmail_list_labels`.
4. Call `gmail_search` with `{ "query": "in:inbox", "maxResults": 3 }`.
5. Call `gmail_create_draft` without `dryRun: false`.

## Troubleshooting

- If Claude cannot start the server, verify the `dist/index.js` path exists.
- If tools show auth errors, run `npm run cli auth login` again.
- If labels/search work but archive or trash fails, re-auth so the token includes `gmail.modify`.