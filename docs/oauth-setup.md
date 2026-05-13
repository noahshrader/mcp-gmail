# OAuth and MCP Setup

This project uses a local OAuth credential file and runs the MCP server over stdio.

## Prerequisites

- Node.js 20 or newer
- A Google Cloud OAuth client for a desktop application
- Local credential JSON saved at `~/.gmail-mcp/credentials.json`

You can override the default credential and token paths with these environment variables:

- `GMAIL_MCP_CREDENTIALS_PATH`
- `GMAIL_MCP_TOKEN_PATH`

## Build the Server

```bash
npm install
npm run build
```

## First OAuth Run

Any command that touches Gmail will trigger the local OAuth flow if a valid token is not already present.

For a manual first run, use the CLI:

```bash
npm run cli auth login
```

This will:

1. Read `credentials.json`
2. Open the Google consent screen in your browser
3. Save the resulting token to `~/.gmail-mcp/token.json`

## Run the MCP Server

Use the built entrypoint:

```bash
npm run mcp
```

That launches the stdio MCP server from `dist/index.js`.

## Claude Desktop Configuration

Add an MCP server entry that points Claude Desktop at the built Node.js server. A typical config looks like this:

```json
{
  "mcpServers": {
    "gmail": {
      "command": "node",
      "args": ["/absolute/path/to/mcp-gmail/dist/index.js"],
      "env": {
        "GMAIL_MCP_CREDENTIALS_PATH": "/absolute/path/to/credentials.json",
        "GMAIL_MCP_TOKEN_PATH": "/absolute/path/to/token.json"
      }
    }
  }
}
```

Replace the placeholder paths with your local values.

## Verification

After Claude Desktop starts the server, verify these calls in order:

1. `gmail_diagnostics`
2. `gmail_list_labels`
3. `gmail_search` with `{ "query": "in:inbox" }`
4. `gmail_create_draft` without `dryRun: false`

Expected results:

- `gmail_diagnostics` returns auth status, granted scopes, and adapter version
- Read tools return structured JSON
- Write tools default to `dryRun: true`

## Troubleshooting

- If OAuth fails, confirm the credential file path and that the OAuth client is configured for a desktop app.
- If the server exits immediately, rebuild with `npm run build` and launch `npm run mcp` directly to inspect stderr.
- If Gmail tools report unauthenticated status, rerun `npm run cli auth login` to refresh local consent.