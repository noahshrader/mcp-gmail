# Folder Structure

```
mcp-gmail/
├── src/
│   ├── index.ts                    Entry point — starts the MCP server (stdio)
│   │
│   ├── gmail/                      Gmail adapter layer (no MCP or CLI knowledge)
│   │   ├── auth.ts                 OAUTH 2.0 flow, token read/write, proactive refresh
│   │   ├── client.ts               Authenticated Gmail API client + Proxy middleware
│   │   ├── scopes.ts               OAUTH scope constants grouped by permission level
│   │   ├── errors.ts               Typed error classes + normalizeGmailError()
│   │   ├── retry.ts                withRetry() — exponential backoff with jitter
│   │   ├── rateLimit.ts            Token-bucket limiter (200 units/sec)
│   │   ├── messages.ts             MessageService — search, read messages, read threads
│   │   ├── state.ts                StateService — archive, trash, mark read/unread, labels
│   │   ├── drafts.ts               DraftService — create, update, reply, send drafts
│   │   ├── labels.ts               LabelService — list labels
│   │   └── __tests__/              Unit tests for every adapter module
│   │
│   ├── server/                     MCP server layer
│   │   ├── server.ts               McpServer wiring — registers tools, starts transport
│   │   ├── dependencies.ts         Builds ServerDependencies from the client factory
│   │   ├── types.ts                ServerDependencies and ServerDependencyOverrides types
│   │   ├── resources/              MCP resources (empty — Phase 4 deferred)
│   │   └── tools/                  One file per MCP tool
│   │       ├── schemas.ts          Shared Zod schemas (id, query, email, label, etc.)
│   │       ├── shared.ts           createToolResult() and runTool() helpers
│   │       ├── search.ts           gmail_search
│   │       ├── read_message.ts     gmail_read_message
│   │       ├── read_thread.ts      gmail_read_thread
│   │       ├── list_labels.ts      gmail_list_labels
│   │       ├── apply_labels.ts     gmail_apply_labels
│   │       ├── remove_labels.ts    gmail_remove_labels
│   │       ├── archive.ts          gmail_archive
│   │       ├── mark_read.ts        gmail_mark_read
│   │       ├── mark_unread.ts      gmail_mark_unread
│   │       ├── trash.ts            gmail_trash
│   │       ├── create_draft.ts     gmail_create_draft
│   │       ├── update_draft.ts     gmail_update_draft
│   │       ├── create_reply_draft.ts  gmail_create_reply_draft
│   │       ├── send_draft.ts       gmail_send_draft
│   │       ├── diagnostics.ts      gmail_diagnostics
│   │       └── __tests__/          Unit tests for tool schema validation and error routing
│   │
│   └── cli/                        CLI layer (auth, read, drafts, labels)
│       ├── index.ts                Commander root — registers sub-command groups
│       ├── types.ts                CliDependencies (stdout, stderr, factories)
│       └── commands/
│           ├── auth.ts             auth login / status / logout
│           ├── read.ts             read search / message / thread
│           ├── draft.ts            draft create / update / send / reply
│           ├── labels.ts           labels list / apply / remove
│           ├── skills.ts           skills list / read (deferred — Phase 4)
│           └── history.ts          history list / clear (deferred — Phase 5)
│
├── docs/                           Project documentation
│   ├── SYSTEM_OVERVIEW.md          What this is and how it works
│   ├── ARCHITECTURE.md             Layer design, data flow, dependency injection
│   ├── FOLDER_STRUCTURE.md         This file
│   ├── PERMISSIONS.md              OAUTH scopes and which tools require each scope
│   ├── RISKS_AND_LIMITATIONS.md    Known constraints and safety considerations
│   ├── OAUTH-SETUP.md              Step-by-step Google Cloud Console setup
│   ├── CLAUDE-DESKTOP.md           Claude Desktop client configuration
│   ├── CLAUDE-CODE.md              Claude Code client configuration
│   ├── CURSOR.md                   Cursor client configuration
│   └── GITHUB-COPILOT.md           VS Code GitHub Copilot client configuration
│
├── dist/                           Compiled JavaScript output (git-ignored)
├── coverage/                       Test coverage reports (git-ignored)
├── package.json
├── tsconfig.json
├── eslint.config.js
├── vitest.config.ts
└── GMAIL_IMPLEMENTATION_PLAN.md    Phased build plan with design rationale
```

## Key conventions

- **ESM throughout**: `"type": "module"` in `package.json`; all imports use `.js` extensions (TypeScript `NodeNext` resolution).
- **No barrel files**: Each module is imported directly by path. Avoids circular dependency risk and makes tree-shaking straightforward.
- **One tool per file**: Each file in `src/server/tools/` registers exactly one MCP tool. Adding a new tool means adding one file and one import in `server.ts`.
- **Tests co-located**: `__tests__/` directories sit next to the code they test, not in a top-level `test/` folder.
- **Deferred phases**: `skills.ts` and `history.ts` in the CLI are intentional stubs. They print "not yet implemented" rather than being absent, so the CLI surface is stable.
