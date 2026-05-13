# Cursor

## Prerequisites

- `npm run build`
- `npm run cli auth login`

## Configure Cursor

Add a new MCP server in Cursor's MCP settings using stdio:

- Command: `node`
- Arguments: `/absolute/path/to/mcp-gmail/dist/index.js`
- Environment:
  - `GMAIL_MCP_CREDENTIALS_PATH=/Users/you/.gmail-mcp/credentials.json`
  - `GMAIL_MCP_TOKEN_PATH=/Users/you/.gmail-mcp/token.json`

If Cursor stores MCP servers in JSON on your setup, use the same command, args, and env values above.

## Verification

1. Restart Cursor or reload MCP settings.
2. Run `gmail_diagnostics`.
3. Run `gmail_list_labels`.
4. Run `gmail_search`.
5. Run a dry-run write tool and confirm the response includes `dryRun: true`.

## Troubleshooting

- If Cursor fails to launch the server, confirm the built file exists and Node.js is on the PATH used by Cursor.
- If the OAUTH browser flow did not complete in the same user session, run the CLI auth step in a terminal first.
- If token refresh fails, delete the local token and authenticate again.