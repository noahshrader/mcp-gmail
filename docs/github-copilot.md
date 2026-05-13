# GitHub Copilot

## Prerequisites

- `npm run build`
- `npm run cli auth login`

## Configure VS Code MCP

Create or update `.vscode/mcp.json`:

```json
{
  "servers": {
    "gmail": {
      "type": "stdio",
      "command": "node",
      "args": ["${workspaceFolder}/dist/index.js"],
      "env": {
        "GMAIL_MCP_CREDENTIALS_PATH": "/Users/you/.gmail-mcp/credentials.json",
        "GMAIL_MCP_TOKEN_PATH": "/Users/you/.gmail-mcp/token.json"
      }
    }
  }
}
```

## Verification

1. Reload the VS Code window.
2. Confirm the Gmail server is listed in the MCP view.
3. Run `gmail_diagnostics`.
4. Run `gmail_list_labels`.
5. Run a dry-run write operation such as `gmail_send_draft` with an existing draft ID.

## Troubleshooting

- If the MCP server is not detected, validate `.vscode/mcp.json` and confirm the build output exists.
- If read tools work but write tools fail, re-run login and grant the updated scopes.
- If the adapter was already authenticated against older scopes, remove `~/.gmail-mcp/token.json` and log in again.