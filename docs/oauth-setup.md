# OAuth and MCP Setup

## Prerequisites

- Node.js 20 or newer
- A Google Cloud OAuth client for a desktop application
- Gmail API enabled in the same Google Cloud project

The adapter uses these default paths:

- Credentials: `~/.gmail-mcp/credentials.json`
- Token: `~/.gmail-mcp/token.json`

You can override them with:

- `GMAIL_MCP_CREDENTIALS_PATH`
- `GMAIL_MCP_TOKEN_PATH`

## Build

```bash
npm install
npm run build
```

## First Login

```bash
npm run cli auth login
```

The adapter will:

1. Read the OAuth client JSON.
2. Start a local callback server on `127.0.0.1` with a random free port.
3. Print and open the consent URL in the default browser.
4. Exchange the callback code for tokens.
5. Save the token locally.

The requested production scope set is:

- `https://www.googleapis.com/auth/gmail.readonly`
- `https://www.googleapis.com/auth/gmail.send`
- `https://www.googleapis.com/auth/gmail.modify`

The CLI login flow also requests `gmail.compose` so draft operations stay explicit during development.

## Verify the Token

```bash
npm run cli auth status
npm run cli labels list
npm run cli messages search "in:inbox" --max-results 5
```

## Run the MCP Server

```bash
npm run mcp
```

That starts the stdio server from `dist/index.js`.

## Safe First MCP Checks

Call these in order from any MCP client:

1. `gmail_diagnostics`
2. `gmail_list_labels`
3. `gmail_search` with `{ "query": "in:inbox", "maxResults": 3 }`
4. `gmail_create_draft` without `dryRun: false`

All write tools default to `dryRun: true`.

## Troubleshooting

- `Missing OAuth client configuration`: the credentials file path is wrong or the JSON is malformed.
- `Gmail authorization is missing or expired`: run `npm run cli auth login` again.
- `Gmail access token could not be refreshed`: the refresh token is stale or revoked; delete the local token and re-auth.
- Browser does not open automatically: copy the printed URL into a browser manually.
- `403` on state-changing tools: re-run the login flow so the token includes `gmail.modify`.

- `gmail_diagnostics` returns auth status, granted scopes, and adapter version
- Read tools return structured JSON
- Write tools default to `dryRun: true`

## Troubleshooting

- If OAuth fails, confirm the credential file path and that the OAuth client is configured for a desktop app.
- If the server exits immediately, rebuild with `npm run build` and launch `npm run mcp` directly to inspect stderr.
- If Gmail tools report unauthenticated status, rerun `npm run cli auth login` to refresh local consent.