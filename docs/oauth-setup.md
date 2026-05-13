# OAUTH and MCP Setup

## Prerequisites

- Node.js 20 or newer

That's it. The steps below will walk you through creating the Google Cloud credentials from scratch.

---

## Step 1 — Create a Google Cloud project

1. Go to [console.cloud.google.com](https://console.cloud.google.com).
2. Click the project selector at the top of the page → **New Project**.
3. Give it a name (e.g. `mcp-gmail`) and click **Create**.
4. Make sure the new project is selected in the top bar before continuing.

---

## Step 2 — Enable the Gmail API

1. In the left sidebar go to **APIs & Services → Library**.
2. Search for **Gmail API** and click it.
3. Click **Enable**.

---

## Step 3 — Configure the OAuth consent screen

This is required before creating credentials.

1. Go to **APIs & Services → OAuth consent screen**.
2. Choose **External** (for a personal account) or **Internal** (for a Google Workspace account) → **Create**.
3. Fill in the required fields:
   - **App name**: anything you like (e.g. `mcp-gmail`)
   - **User support email**: your email address
   - **Developer contact email**: your email address
4. Click **Save and Continue** through the Scopes and Test Users screens — no changes needed there.
5. Click **Back to Dashboard**.

> If your app is in **Testing** mode, only email addresses you add as test users can authorize it. Add your own address under **Test Users** if needed.

---

## Step 4 — Create OAuth credentials

1. Go to **APIs & Services → Credentials**.
2. Click **+ Create Credentials → OAuth client ID**.
3. For **Application type** choose **Desktop app**.
4. Give it a name (e.g. `mcp-gmail-desktop`) → **Create**.
5. A dialog will show your client ID and secret. Click **Download JSON**.
6. Save the downloaded file — it is named something like `client_secret_....json`.

---

## Step 5 — Place the credentials file

```bash
mkdir -p ~/.gmail-mcp
mv ~/Downloads/client_secret_*.json ~/.gmail-mcp/credentials.json
chmod 600 ~/.gmail-mcp/credentials.json
```

The adapter looks for credentials at `~/.gmail-mcp/credentials.json` by default. You can change this with the `GMAIL_MCP_CREDENTIALS_PATH` environment variable.

---

## Step 6 — Build and run the first login

```bash
npm install
npm run build
npm run cli auth login
```

The adapter will:

1. Read the OAUTH client JSON.
2. Start a local callback server on `127.0.0.1` with a random free port.
3. Print and open the consent URL in your default browser.
4. Wait for you to approve access in the browser.
5. Exchange the callback code for tokens and save them to `~/.gmail-mcp/token.json`.

The scopes requested during login are:

- `https://www.googleapis.com/auth/gmail.readonly` — read messages, labels, threads
- `https://www.googleapis.com/auth/gmail.compose` — create and manage drafts
- `https://www.googleapis.com/auth/gmail.send` — send drafts
- `https://www.googleapis.com/auth/gmail.modify` — archive, trash, mark read/unread, labels

See [PERMISSIONS.md](PERMISSIONS.md) for a full breakdown of which tools use each scope.

---

## Step 7 — Verify the token

```bash
npm run cli auth status
npm run cli labels list
npm run cli messages search "in:inbox" --max-results 5
```

---

## Run the MCP Server

```bash
npm run mcp
```

Starts the stdio server from `dist/index.js`. Your MCP client connects to this process. See the client guides in this folder for client-specific configuration.

## Safe First MCP Checks

Call these in order from any MCP client after connecting:

1. `gmail_diagnostics` — confirms auth status, granted scopes, and adapter version
2. `gmail_list_labels` — lists all labels
3. `gmail_search` with `{ "query": "in:inbox", "maxResults": 3 }`
4. `gmail_create_draft` without `dryRun: false` — previews a draft without creating it

All write tools default to `dryRun: true`.

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| `Missing OAUTH client configuration` | Credentials file path is wrong or the JSON is malformed. Confirm the file exists at `~/.gmail-mcp/credentials.json` (or your custom path) and is the JSON downloaded from Google Cloud. |
| `Gmail authorization is missing or expired` | Run `npm run cli auth login` again. |
| `Gmail access token could not be refreshed` | The refresh token is stale or was revoked. Delete `~/.gmail-mcp/token.json` and re-run `auth login`. |
| Browser does not open automatically | Copy the printed URL from the terminal and paste it into a browser manually. |
| `403` on write tools | The token is missing `gmail.modify`. Delete `~/.gmail-mcp/token.json` and re-run `auth login` to get a fresh token with the full scope set. |
| Server exits immediately | Rebuild with `npm run build` and run `npm run mcp` directly to see stderr output. |
| App shows "This app isn't verified" in the consent screen | This is expected for a personal-use Desktop app in Testing mode. Click **Advanced → Go to [app name] (unsafe)** to proceed. |