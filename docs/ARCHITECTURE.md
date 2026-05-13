# Architecture

mcp-gmail is organized into three independent layers connected by dependency injection. Each layer has a single responsibility and can be tested without the others.

## Layers

```
┌─────────────────────────────────────────────────────┐
│  Clients                                            │
│  Claude Desktop · Cursor · VS Code · Claude Code   │
└──────────────────────┬──────────────────────────────┘
                       │ stdio (JSON-RPC / MCP)
┌──────────────────────▼──────────────────────────────┐
│  Layer 2 — MCP Server  (src/server/)                │
│  Tool registration, schema validation, routing      │
└──────────────────────┬──────────────────────────────┘
                       │ GmailClientFactory (injected)
┌──────────────────────▼──────────────────────────────┐
│  Layer 1 — Gmail Adapter  (src/gmail/)              │
│  Auth, services, error handling, retry, rate limit  │
└──────────────────────┬──────────────────────────────┘
                       │ googleapis (HTTPS)
                   Gmail API
```

The CLI (`src/cli/`) is a parallel consumer of Layer 1 — it uses the same adapter but surfaces it as a command-line interface rather than an MCP server.

## Layer 1 — Gmail Adapter (`src/gmail/`)

The adapter is the only code that talks to Google. It has no knowledge of MCP or the CLI.

| Module | Responsibility |
|---|---|
| `auth.ts` | OAuth 2.0 flow, token persistence, proactive refresh (5-min window) |
| `client.ts` | Builds an authenticated `gmail_v1.Gmail` instance wrapped in a Proxy that applies retry and rate limiting to every API call transparently |
| `scopes.ts` | Scope constants grouped by permission level |
| `errors.ts` | Typed error hierarchy (`GmailError` subclasses) and `normalizeGmailError()` which maps raw API errors to stable `GmailErrorCode` strings |
| `retry.ts` | `withRetry<T>()` — exponential backoff, retries only `GmailRateLimitError` and `GmailServerError` |
| `rateLimit.ts` | Token-bucket limiter at 200 units/sec (under Gmail's 250/sec quota) |
| `messages.ts` | `MessageService` — search, read messages, read threads |
| `state.ts` | `StateService` — archive, trash, mark read/unread, apply/remove labels |
| `drafts.ts` | `DraftService` — create, update, reply, send drafts |
| `labels.ts` | `LabelService` — list user-defined and system labels |

### Proxy-based middleware

`client.ts` wraps the Gmail API object in a recursive `Proxy`. When any method is called, the Proxy intercepts the call, acquires a rate-limit token, then executes the method inside `withRetry`. All services inherit retry and rate limiting without any changes to service code.

```
gmail.users.messages.list(...)
         ↓ Proxy intercepts
acquireRateLimitToken()
withRetry(() => original.users.messages.list(...))
```

### Error flow

```
Raw googleapis error
        ↓
normalizeGmailError()  →  GmailError subclass with stable code
        ↓
runTool() catch handler  →  { error: string, code: GmailErrorCode }
        ↓
MCP CallToolResult { isError: true }
```

## Layer 2 — MCP Server (`src/server/`)

| Module | Responsibility |
|---|---|
| `server.ts` | Creates the `McpServer`, registers all tools, starts stdio transport |
| `dependencies.ts` | Builds the `ServerDependencies` object (constructs all services from the injected factory) |
| `types.ts` | `ServerDependencies` and `ServerDependencyOverrides` interfaces |
| `tools/schemas.ts` | Shared Zod schemas (`idSchema`, `querySchema`, `labelIdSchema`, etc.) reused across all tool definitions |
| `tools/shared.ts` | `createToolResult()` and `runTool()` — uniform success/error response shaping |
| `tools/*.ts` | One file per MCP tool — schema definition, handler, and `server.tool()` registration |

### Dependency injection

Each tool file receives a `ServerDependencies` object at registration time:

```typescript
export type GmailClientFactory = () => Promise<gmail_v1.Gmail>;

interface ServerDependencies {
  clientFactory: GmailClientFactory;
  messageService: () => MessageService;
  stateService:   () => StateService;
  draftService:   () => DraftService;
  labelService:   () => LabelService;
  threadService:  () => ThreadService;
  adapterVersion: string;
}
```

Tests override any factory with a mock — no real OAuth or HTTP calls needed.

## Layer 3 — CLI (`src/cli/`)

| Module | Responsibility |
|---|---|
| `index.ts` | `commander` root command, registers sub-commands |
| `types.ts` | `CliDependencies` (stdout, stderr, factories — overridable in tests) |
| `commands/auth.ts` | `auth login` / `auth status` / `auth logout` — manages the OAuth flow |
| `commands/read.ts` | `read search` / `read message` / `read thread` |
| `commands/draft.ts` | `draft create` / `draft update` / `draft send` / `draft reply` |
| `commands/labels.ts` | `labels list` / `labels apply` / `labels remove` |
| `commands/skills.ts` | `skills list` / `skills read` — deferred (Phase 4) |
| `commands/history.ts` | `history list` / `history clear` — deferred (Phase 5) |

## Data flow — example: `gmail_search`

1. MCP client sends a `tools/call` request with `name: "gmail_search"` and `arguments: { query: "...", maxResults: 10 }`
2. `search.ts` validates `arguments` against its Zod schema
3. `runTool()` calls `deps.messageService().searchMessages(query, maxResults)`
4. `MessageService.searchMessages` calls `gmail.users.messages.list(...)` via the Proxy
5. The Proxy acquires a rate-limit token and executes with `withRetry`
6. The result is shaped into a `CallToolResult` with `{ messages: [...] }` and returned over stdio
