# Gmail MCP — Implementation Plan

> **Status:** Pre-implementation plan. Review before writing feature code.  
> **Architect:** Senior TypeScript / MCP engineer  
> **Date:** 2026-05-13  

---

## Table of Contents

1. [Scope](#1-scope)
2. [Assumptions](#2-assumptions)
3. [Architecture Overview](#3-architecture-overview)
4. [Folder / Package Structure](#4-folder--package-structure)
5. [Phase-by-Phase Implementation Plan](#5-phase-by-phase-implementation-plan)
6. [Tool Contracts](#6-tool-contracts)
7. [Gmail OAuth / Scopes Plan](#7-gmail-oauth--scopes-plan)
8. [Safety Model](#8-safety-model)
9. [Storage / History Model](#9-storage--history-model)
10. [Deferred Work](#10-deferred-work)
11. [Risks and Limitations](#11-risks-and-limitations)
12. [Exit Criteria per Phase](#12-exit-criteria-per-phase)

---

## 1. Scope

This plan covers the design and phased build-out of a **local-first Gmail MCP server** written in TypeScript. The goal is to expose Gmail read/search/draft/label operations to MCP-compatible AI clients (Claude Desktop, Claude Code, GitHub Copilot, Cursor, Codex, etc.) while keeping the reusable Gmail adapter independent of the MCP transport layer.

### In scope

| Category | Capabilities |
|---|---|
| **Read** | List labels, search messages, read message, read thread, detect/list attachment metadata |
| **Draft / Write** | Create draft, update draft, send draft, create reply draft |
| **State** | Archive, mark read, mark unread, apply labels, remove labels, move to trash |
| **MCP** | Full tool surface matching the canonical tool names below |
| **CLI** | Diagnostic and manual-testing CLI for every adapter operation |
| **Skills** | Markdown skill files that declare purpose, tools, inputs, outputs, safety rules, examples |
| **Storage** | Local JSON run history; optional local Markdown snapshots |
| **OAuth** | Local credential file, least-privilege scope progression per phase |

### Out of scope (MVP)

- Permanent delete (`gmail.trash` is the floor)
- Autonomous email sending (agent must call `gmail_send_draft` explicitly)
- Hosted infrastructure, cloud sync, or background agents
- Electron UI
- Vector / semantic search
- Complex workflow engine or memory graph

---

## 2. Assumptions

1. **Node.js ≥ 20** and **TypeScript ≥ 5.4** are the runtime and language targets.
2. The Google Cloud project and OAuth 2.0 credentials (client ID / secret) are created out-of-band by the operator before Phase 1 begins.
3. Credentials live at `~/.gmail-mcp/credentials.json`; tokens at `~/.gmail-mcp/token.json`. Both paths are configurable via environment variables.
4. Only a single Google account is supported in the MVP. Multi-account support is deferred.
5. The MCP SDK used is the **official Model Context Protocol TypeScript SDK** (`@modelcontextprotocol/sdk`).
6. Gmail API is accessed via `googleapis` (the official Google API client for Node.js).
7. Markdown skill files are agent-agnostic; they carry no runtime dependencies and are read by the MCP server as static resources.
8. All write operations default to **dry-run** unless the caller explicitly passes `dryRun: false`.
9. Attachment bodies are never stored locally unless the operator explicitly opts in.

---

## 3. Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     MCP Clients                             │
│  Claude Desktop · Claude Code · Copilot · Cursor · Codex   │
└──────────────────────────┬──────────────────────────────────┘
                           │  stdio / SSE (MCP transport)
┌──────────────────────────▼──────────────────────────────────┐
│                   MCP Server  (src/server/)                  │
│  Tool dispatch · Resource routing · Prompt registration      │
└──────────────────────────┬──────────────────────────────────┘
                           │  TypeScript function calls
┌──────────────────────────▼──────────────────────────────────┐
│               Gmail Adapter  (src/gmail/)                    │
│  GmailClient · MessageService · DraftService · LabelService  │
│  ThreadService · AttachmentService · AuthService             │
└──────────────────────────┬──────────────────────────────────┘
                           │  googleapis REST calls
┌──────────────────────────▼──────────────────────────────────┐
│                   Gmail API (Google)                         │
└─────────────────────────────────────────────────────────────┘

Orthogonal concerns (no external dependencies):
  src/skills/   — Markdown skill definitions
  src/storage/  — Local JSON run history writer
  src/cli/      — Commander-based CLI
```

### Key design principles

- **Adapter is the product.** The Gmail adapter (`src/gmail/`) must be usable without MCP, CLI, or any framework.
- **MCP is a thin dispatch layer.** Each MCP tool handler calls exactly one adapter method. No business logic lives in `src/server/`.
- **Dry-run by default.** Every write operation accepts a `dryRun` flag and returns a preview payload when true.
- **No secrets in logs or history.** The run-history writer strips sensitive fields before persistence.
- **Explicit over automatic.** No action is taken without an explicit tool call from the client.

---

## 4. Folder / Package Structure

```
mcp-gmail/
├── GMAIL_IMPLEMENTATION_PLAN.md   ← this file
├── README.md
├── package.json
├── tsconfig.json
├── .eslintrc.json
├── .prettierrc
├── .gitignore
│
├── src/
│   ├── index.ts                   ← MCP server entry point (stdio)
│   │
│   ├── gmail/                     ← Gmail adapter (framework-agnostic)
│   │   ├── auth.ts                ← OAuth2 token management
│   │   ├── client.ts              ← Authenticated googleapis client factory
│   │   ├── labels.ts              ← LabelService
│   │   ├── messages.ts            ← MessageService (search, read)
│   │   ├── threads.ts             ← ThreadService
│   │   ├── drafts.ts              ← DraftService (create, update, send, reply)
│   │   ├── attachments.ts         ← AttachmentService (metadata only)
│   │   ├── state.ts               ← StateService (archive, trash, read/unread, labels)
│   │   └── types.ts               ← Shared Gmail domain types
│   │
│   ├── server/                    ← MCP server layer
│   │   ├── server.ts              ← Server bootstrap, tool/resource registration
│   │   ├── tools/                 ← One file per MCP tool
│   │   │   ├── diagnostics.ts
│   │   │   ├── list_labels.ts
│   │   │   ├── search.ts
│   │   │   ├── read_message.ts
│   │   │   ├── read_thread.ts
│   │   │   ├── create_draft.ts
│   │   │   ├── update_draft.ts
│   │   │   ├── send_draft.ts
│   │   │   ├── create_reply_draft.ts
│   │   │   ├── archive.ts
│   │   │   ├── mark_read.ts
│   │   │   ├── mark_unread.ts
│   │   │   ├── apply_labels.ts
│   │   │   ├── remove_labels.ts
│   │   │   └── trash.ts
│   │   └── resources/             ← MCP resources (skills_list, skills_read)
│   │       └── skills.ts
│   │
│   ├── skills/                    ← Markdown skill definitions
│   │   ├── inbox-triage.md
│   │   ├── follow-up-detector.md
│   │   ├── meeting-follow-up-drafter.md
│   │   ├── client-project-digest.md
│   │   ├── unanswered-email-finder.md
│   │   ├── important-email-summary.md
│   │   ├── newsletter-digest.md
│   │   ├── receipt-invoice-extraction.md
│   │   └── open-loop-detector.md
│   │
│   ├── storage/                   ← Local run history
│   │   ├── history.ts             ← RunHistoryWriter
│   │   └── types.ts
│   │
│   └── cli/                       ← CLI entry point and commands
│       ├── index.ts               ← Commander root
│       └── commands/
│           ├── auth.ts
│           ├── labels.ts
│           ├── search.ts
│           ├── read.ts
│           ├── draft.ts
│           └── history.ts
│
└── docs/
    └── oauth-setup.md             ← Human-readable OAuth setup guide
```

---

## 5. Phase-by-Phase Implementation Plan

---

### Phase 0 — Repository / Workspace Foundation

**Goal:** Working TypeScript monorepo with lint, build, and test infrastructure.

**Tasks:**

1. Initialize `package.json` with `name`, `type: "module"`, `engines: { node: ">=20" }`.
2. Add dependencies: `typescript`, `@types/node`, `googleapis`, `@modelcontextprotocol/sdk`, `commander`, `zod`.
3. Add dev dependencies: `tsx`, `vitest`, `eslint`, `prettier`.
4. Configure `tsconfig.json`: `target: ES2022`, `module: NodeNext`, `moduleResolution: NodeNext`, `strict: true`, `outDir: dist`.
5. Configure ESLint (TypeScript rules), Prettier.
6. Add `.gitignore` (node_modules, dist, `*.token.json`, `~/.gmail-mcp/`).
7. Add `scripts` in `package.json`: `build`, `dev`, `lint`, `test`, `cli`.
8. Create empty `src/index.ts` that prints a startup message.
9. Add a smoke test confirming the project builds.

---

### Phase 1 — Gmail Adapter / Service MVP

**Goal:** A pure TypeScript adapter that can authenticate with Gmail and perform all read operations without any MCP dependency.

**Tasks:**

1. **`src/gmail/auth.ts`** — OAuth2 flow:
   - Load credentials from `credentials.json`.
   - Load/save token from `token.json`.
   - Implement `authorize()`: opens browser for consent on first run, saves token, refreshes automatically.
   - Expose `getAuthClient(): OAuth2Client`.

2. **`src/gmail/client.ts`** — Factory:
   - `getGmailClient(): gmail_v1.Gmail` — returns authenticated googleapis Gmail instance.

3. **`src/gmail/types.ts`** — Domain types:
   - `Label`, `MessageSummary`, `MessageDetail`, `ThreadSummary`, `ThreadDetail`, `DraftSummary`, `AttachmentMetadata`, `SearchOptions`, `DraftPayload`, `StateChange`.

4. **`src/gmail/labels.ts`** — `LabelService`:
   - `listLabels(): Promise<Label[]>`

5. **`src/gmail/messages.ts`** — `MessageService`:
   - `searchMessages(query: string, options?: SearchOptions): Promise<MessageSummary[]>`
   - `getMessage(id: string): Promise<MessageDetail>`
   - `detectAttachments(message: MessageDetail): AttachmentMetadata[]`

6. **`src/gmail/threads.ts`** — `ThreadService`:
   - `getThread(id: string): Promise<ThreadDetail>`

7. **`src/gmail/attachments.ts`** — `AttachmentService`:
   - `listAttachmentMetadata(messageId: string): Promise<AttachmentMetadata[]>`
   - No attachment body download in MVP.

8. **`src/gmail/drafts.ts`** — `DraftService`:
   - `createDraft(payload: DraftPayload, dryRun?: boolean): Promise<DraftResult>`
   - `updateDraft(id: string, payload: DraftPayload, dryRun?: boolean): Promise<DraftResult>`
   - `sendDraft(id: string, dryRun?: boolean): Promise<SendResult>`
   - `createReplyDraft(threadId: string, payload: DraftPayload, dryRun?: boolean): Promise<DraftResult>`

9. **`src/gmail/state.ts`** — `StateService`:
   - `archiveMessage(id: string, dryRun?: boolean): Promise<StateResult>`
   - `trashMessage(id: string, dryRun?: boolean): Promise<StateResult>`
   - `markRead(id: string, dryRun?: boolean): Promise<StateResult>`
   - `markUnread(id: string, dryRun?: boolean): Promise<StateResult>`
   - `applyLabels(id: string, labelIds: string[], dryRun?: boolean): Promise<StateResult>`
   - `removeLabels(id: string, labelIds: string[], dryRun?: boolean): Promise<StateResult>`

10. Unit tests for each service (mock googleapis responses with `vitest`).

---

### Phase 2 — CLI MVP

**Goal:** Command-line tool that exercises the adapter directly, useful for diagnostics and manual testing without an MCP client.

**Tasks:**

1. **`src/cli/index.ts`** — `commander` root program, version from `package.json`.

2. **`cli auth`** sub-commands:
   - `cli auth login` — runs the OAuth consent flow.
   - `cli auth status` — prints token expiry and scopes.
   - `cli auth revoke` — deletes local token.

3. **`cli labels list`** — calls `LabelService.listLabels()`, pretty-prints.

4. **`cli messages search <query>`** — calls `MessageService.searchMessages()`, prints summaries.

5. **`cli messages read <id>`** — calls `MessageService.getMessage()`, prints detail.

6. **`cli threads read <id>`** — calls `ThreadService.getThread()`, prints thread.

7. **`cli draft create`** — interactive or flag-driven; calls `DraftService.createDraft()` with `--dry-run` default.

8. **`cli draft send <id>`** — calls `DraftService.sendDraft()` with `--dry-run` default; requires `--confirm` flag to actually send.

9. **`cli history list`** — prints local run history (Phase 5 stub accepted).

10. Integration tests: run CLI commands against a mocked adapter.

---

### Phase 3 — MCP Server MVP

**Goal:** A working MCP server exposing all planned tools over stdio, usable by Claude Desktop.

**Tasks:**

1. **`src/server/server.ts`** — Bootstrap:
   - Create `McpServer` instance.
   - Register all tools.
   - Register all resources.
   - Connect via `StdioServerTransport`.

2. **Tool handlers** (`src/server/tools/`):
   - One file per tool (see Section 6).
   - Each handler validates input with `zod`, calls exactly one adapter method, returns structured JSON result.

3. **`src/server/resources/skills.ts`**:
   - `skills_list` resource: returns list of available skill files.
   - `skills_read` resource: returns content of a named skill file.

4. **`src/index.ts`** — Entry point: calls `server.ts` bootstrap.

5. Add `mcp` script to `package.json`: `node dist/index.js`.

6. Manual integration test: connect Claude Desktop, confirm `gmail_diagnostics` and `gmail_list_labels` return correct results.

7. Add server-level error handling: any adapter error returns a structured MCP error response (no raw stack traces to the client).

---

### Phase 4 — Markdown Skills MVP

**Goal:** A set of agent-agnostic Markdown skill files that any MCP-compatible agent can discover and execute.

**Tasks:**

1. Define a **skill frontmatter schema** (YAML in Markdown front matter):
   ```yaml
   ---
   name: inbox-triage
   purpose: "..."
   whenToUse: "..."
   requiredTools: [gmail_search, gmail_read_message, gmail_list_labels]
   inputs: [...]
   outputs: [...]
   safetyRules: [...]
   examples: [...]
   ---
   ```

2. Write all nine skill files (see Section 1 scope):
   - `inbox-triage.md`
   - `follow-up-detector.md`
   - `meeting-follow-up-drafter.md`
   - `client-project-digest.md`
   - `unanswered-email-finder.md`
   - `important-email-summary.md`
   - `newsletter-digest.md`
   - `receipt-invoice-extraction.md`
   - `open-loop-detector.md`

3. Implement `skills_list` MCP resource: returns parsed frontmatter for all skills.

4. Implement `skills_read` MCP resource: returns full Markdown content for a named skill.

5. Implement `workflow_preview` MCP tool: given a skill name and optional parameters, returns a step-by-step preview of which tools would be called (no execution).

6. Add a `cli skills list` and `cli skills read <name>` command that reads the same files.

---

### Phase 5 — Local Storage / Run History MVP

**Goal:** Deterministic, inspectable local log of every tool invocation and its outcome.

**Tasks:**

1. **`src/storage/types.ts`** — `RunRecord`:
   ```typescript
   interface RunRecord {
     id: string;           // ulid
     timestamp: string;    // ISO 8601
     tool: string;
     input: Record<string, unknown>;  // sensitive fields stripped
     result: 'success' | 'dry_run' | 'error';
     summary: string;      // human-readable one-liner
     dryRun: boolean;
     durationMs: number;
   }
   ```

2. **`src/storage/history.ts`** — `RunHistoryWriter`:
   - `write(record: RunRecord): Promise<void>` — appends to `~/.gmail-mcp/history.jsonl`.
   - `list(limit?: number): Promise<RunRecord[]>` — reads last N records.
   - `clear(): Promise<void>`.

3. Wire `RunHistoryWriter` into every MCP tool handler (post-call, never blocking).

4. **`cli history list`** — prints last 20 runs in a table.
   **`cli history clear`** — prompts for confirmation, clears history.

5. Define and enforce **sensitive field stripping rules**:
   - Strip: `body`, `snippet`, `payload.parts[*].body.data`, `raw`.
   - Preserve: `id`, `threadId`, `labelIds`, `subject`, `from`, `to`, `date`.

---

### Phase 6 — Workflow Preview and Synthesis

**Goal:** Let agents preview multi-step workflows before executing, inspect past runs, and understand what a skill will do.

**Tasks:**

1. **`workflow_preview` tool** (already stubbed in Phase 4):
   - Accept `skillName` and `params`.
   - Return an ordered list of `{ step, tool, estimatedInputs, safetyNotes }` objects.
   - Never executes any adapter calls.

2. **`gmail_diagnostics` tool enhancement**:
   - Return: auth status, token expiry, active scopes, recent run count, adapter version.

3. **Run history integration in MCP**: expose `history_list` and `history_clear` as MCP tools (read-only safe; clear requires `confirm: true`).

4. Add a `--preview` flag to all CLI write commands that prints the workflow preview before asking for confirmation.

5. Documentation: write `docs/skills-authoring.md` explaining the skill frontmatter schema and how to write new skills.

---

### Phase 7 — Hardening and Client Integrations

**Goal:** Production-ready reliability, security audit, and verified integration guides for all target MCP clients.

**Tasks:**

1. **Security audit**:
   - Review all OAuth scope usage; confirm least-privilege per operation.
   - Confirm no sensitive data persists in history.
   - Confirm `dry_run` cannot be bypassed by input coercion.
   - Review `zod` schemas for injection/abuse vectors in search queries.

2. **Error handling hardening**:
   - Classify all Gmail API errors (auth, rate-limit, not-found, server error).
   - Return structured error types to MCP clients.
   - Add retry logic (exponential backoff) for rate-limit and transient errors.

3. **Rate limiting**: implement a lightweight local rate-limiter to stay within Gmail API quotas.

4. **Input validation hardening**: enforce max lengths, allowlists on label IDs, and reject obviously malformed message IDs before hitting the API.

5. **Client integration guides** (`docs/`):
   - `claude-desktop.md`
   - `claude-code.md`
   - `github-copilot.md`
   - `cursor.md`

6. **Token refresh hardening**: detect and surface token expiry errors before they reach a tool call.

7. **Test coverage**: reach ≥ 80% unit test coverage across adapter services.

8. **Changelog and versioning**: adopt semantic versioning; tag `v1.0.0` on exit criteria completion.

---

## 6. Tool Contracts

All tools follow the same structure:

```typescript
{
  name: string;             // snake_case canonical name
  description: string;      // one-sentence description for the model
  inputSchema: ZodSchema;   // validated at call time
  handler: (input) => Promise<ToolResult>;
}
```

`ToolResult` is always a JSON-serializable object. Errors are returned as `{ error: string, code: string }` rather than thrown.

---

### `gmail_diagnostics`

| Field | Value |
|---|---|
| **Purpose** | Report adapter health, auth status, token expiry, and active scopes |
| **Inputs** | _(none)_ |
| **Output** | `{ authenticated, tokenExpiry, scopes[], adapterVersion, recentRunCount }` |
| **Safety** | Read-only. Never returns token values. |
| **Dry-run** | N/A |

---

### `gmail_list_labels`

| Field | Value |
|---|---|
| **Purpose** | Return all Gmail labels for the authenticated account |
| **Inputs** | _(none)_ |
| **Output** | `{ labels: Label[] }` where `Label = { id, name, type, messagesTotal?, messagesUnread? }` |
| **Safety** | Read-only |
| **Dry-run** | N/A |

---

### `gmail_search`

| Field | Value |
|---|---|
| **Purpose** | Search messages using Gmail query syntax |
| **Inputs** | `{ query: string, maxResults?: number (default 20, max 100), pageToken?: string }` |
| **Output** | `{ messages: MessageSummary[], nextPageToken? }` |
| **Safety** | Read-only. `query` length capped at 500 chars. |
| **Dry-run** | N/A |

---

### `gmail_read_message`

| Field | Value |
|---|---|
| **Purpose** | Read the full detail of a single message |
| **Inputs** | `{ id: string, includeBody?: boolean (default true) }` |
| **Output** | `{ message: MessageDetail }` |
| **Safety** | Read-only. Body returned as plain text; HTML stripped. |
| **Dry-run** | N/A |

---

### `gmail_read_thread`

| Field | Value |
|---|---|
| **Purpose** | Read all messages in a thread |
| **Inputs** | `{ id: string }` |
| **Output** | `{ thread: ThreadDetail }` |
| **Safety** | Read-only |
| **Dry-run** | N/A |

---

### `gmail_create_draft`

| Field | Value |
|---|---|
| **Purpose** | Create a new email draft |
| **Inputs** | `{ to: string[], subject: string, body: string, cc?: string[], bcc?: string[], dryRun?: boolean (default true) }` |
| **Output** | `{ draftId?, preview: DraftPreview, dryRun: boolean }` |
| **Safety** | Write. Defaults to `dryRun: true`. Returns preview when dry. |
| **Dry-run** | Yes — returns full preview without creating draft |

---

### `gmail_update_draft`

| Field | Value |
|---|---|
| **Purpose** | Update an existing draft |
| **Inputs** | `{ id: string, to?: string[], subject?: string, body?: string, cc?: string[], bcc?: string[], dryRun?: boolean (default true) }` |
| **Output** | `{ draftId, preview: DraftPreview, dryRun: boolean }` |
| **Safety** | Write. Defaults to `dryRun: true`. |
| **Dry-run** | Yes |

---

### `gmail_send_draft`

| Field | Value |
|---|---|
| **Purpose** | Send an existing draft |
| **Inputs** | `{ id: string, dryRun?: boolean (default true) }` |
| **Output** | `{ messageId?, preview: SendPreview, dryRun: boolean }` |
| **Safety** | **Highest risk write.** Defaults to `dryRun: true`. Requires explicit `dryRun: false` to actually send. Returns full preview of recipient/subject/body when dry. |
| **Dry-run** | Yes — required path before send |

---

### `gmail_create_reply_draft`

| Field | Value |
|---|---|
| **Purpose** | Create a draft reply to an existing thread |
| **Inputs** | `{ threadId: string, body: string, replyToMessageId?: string, dryRun?: boolean (default true) }` |
| **Output** | `{ draftId?, preview: DraftPreview, dryRun: boolean }` |
| **Safety** | Write. Defaults to `dryRun: true`. Inherits `to`, `subject` from the replied-to message. |
| **Dry-run** | Yes |

---

### `gmail_archive`

| Field | Value |
|---|---|
| **Purpose** | Archive a message (remove INBOX label) |
| **Inputs** | `{ id: string, dryRun?: boolean (default true) }` |
| **Output** | `{ id, action: 'archive', dryRun: boolean }` |
| **Safety** | Reversible (can move back to inbox). Defaults to `dryRun: true`. |
| **Dry-run** | Yes |

---

### `gmail_mark_read`

| Field | Value |
|---|---|
| **Purpose** | Mark a message as read |
| **Inputs** | `{ id: string, dryRun?: boolean (default true) }` |
| **Output** | `{ id, action: 'mark_read', dryRun: boolean }` |
| **Safety** | Reversible. Defaults to `dryRun: true`. |
| **Dry-run** | Yes |

---

### `gmail_mark_unread`

| Field | Value |
|---|---|
| **Purpose** | Mark a message as unread |
| **Inputs** | `{ id: string, dryRun?: boolean (default true) }` |
| **Output** | `{ id, action: 'mark_unread', dryRun: boolean }` |
| **Safety** | Reversible. Defaults to `dryRun: true`. |
| **Dry-run** | Yes |

---

### `gmail_apply_labels`

| Field | Value |
|---|---|
| **Purpose** | Add one or more labels to a message |
| **Inputs** | `{ id: string, labelIds: string[], dryRun?: boolean (default true) }` |
| **Output** | `{ id, appliedLabelIds: string[], dryRun: boolean }` |
| **Safety** | Reversible. `labelIds` validated against existing labels before apply. |
| **Dry-run** | Yes |

---

### `gmail_remove_labels`

| Field | Value |
|---|---|
| **Purpose** | Remove one or more labels from a message |
| **Inputs** | `{ id: string, labelIds: string[], dryRun?: boolean (default true) }` |
| **Output** | `{ id, removedLabelIds: string[], dryRun: boolean }` |
| **Safety** | Reversible. Cannot remove `SENT` or `SPAM` system labels. |
| **Dry-run** | Yes |

---

### `gmail_trash`

| Field | Value |
|---|---|
| **Purpose** | Move a message to Trash |
| **Inputs** | `{ id: string, dryRun?: boolean (default true) }` |
| **Output** | `{ id, action: 'trash', dryRun: boolean }` |
| **Safety** | Soft-delete only. Google auto-purges trash after 30 days (outside adapter control). No permanent delete exposed. Defaults to `dryRun: true`. |
| **Dry-run** | Yes |

---

### `skills_list` (MCP Resource)

| Field | Value |
|---|---|
| **Purpose** | Return a list of available skill definitions |
| **URI** | `gmail://skills` |
| **Output** | `{ skills: SkillMeta[] }` where `SkillMeta = { name, purpose, requiredTools[], whenToUse }` |
| **Safety** | Read-only |

---

### `skills_read` (MCP Resource)

| Field | Value |
|---|---|
| **Purpose** | Return full Markdown content and parsed frontmatter for a named skill |
| **URI** | `gmail://skills/{name}` |
| **Output** | `{ skill: SkillMeta, markdown: string }` |
| **Safety** | Read-only |

---

### `workflow_preview` (MCP Tool)

| Field | Value |
|---|---|
| **Purpose** | Preview which tools a skill would invoke, without executing anything |
| **Inputs** | `{ skillName: string, params?: Record<string, unknown> }` |
| **Output** | `{ steps: WorkflowStep[] }` where `WorkflowStep = { step, tool, estimatedInputs, safetyNotes }` |
| **Safety** | Read-only. No adapter calls made. |
| **Dry-run** | N/A (always preview-only) |

---

## 7. Gmail OAuth / Scopes Plan

### Scope progression by phase

| Phase | Scopes Added | Reason |
|---|---|---|
| Phase 0 | _(none)_ | No API calls yet |
| Phase 1 (read) | `https://www.googleapis.com/auth/gmail.readonly` | Labels, search, read messages/threads |
| Phase 1 (draft) | `https://www.googleapis.com/auth/gmail.compose` | Create, update drafts only |
| Phase 3 (send) | `https://www.googleapis.com/auth/gmail.send` | Send drafts — added intentionally, not bundled |
| Phase 3 (modify) | `https://www.googleapis.com/auth/gmail.modify` | Archive, label, mark read/unread, trash |

> **Note:** `gmail.modify` is a superset of `gmail.compose` and `gmail.readonly`. However, scopes are escalated phase by phase to make the surface area explicit during development. In production, the minimal effective set is `gmail.readonly + gmail.send + gmail.modify`.

### What is never requested

- `https://mail.google.com/` (full access) — never used
- Any scope enabling calendar, contacts, or Drive

### Token management

- Tokens stored at `~/.gmail-mcp/token.json` (path configurable via `GMAIL_MCP_TOKEN_PATH`).
- Credentials stored at `~/.gmail-mcp/credentials.json` (path configurable via `GMAIL_MCP_CREDENTIALS_PATH`).
- Token auto-refreshed by the `google-auth-library` OAuth2Client.
- Token expiry surface in `gmail_diagnostics`.
- `cli auth revoke` deletes the local token (does not revoke at Google; link to Google account page provided).
- Token file is never logged, never written to run history, never exposed in MCP tool output.

### OAuth consent flow

1. First call to any adapter method triggers `authorize()`.
2. A localhost redirect URI (`http://localhost:PORT/oauth2callback`) is used.
3. The consent URL is printed to stderr / opened in the default browser.
4. After consent, the code is exchanged for tokens and saved locally.
5. Subsequent runs use the saved token (with auto-refresh).

---

## 8. Safety Model

### Principles

1. **No permanent delete.** The lowest floor is `gmail_trash`. Google handles auto-purge after 30 days.
2. **No autonomous send.** `gmail_send_draft` requires explicit `dryRun: false` from the client. The tool defaults to `dryRun: true`.
3. **Dry-run by default.** All write tools (`create_draft`, `update_draft`, `send_draft`, `create_reply_draft`, `archive`, `trash`, `mark_read`, `mark_unread`, `apply_labels`, `remove_labels`) default `dryRun: true`.
4. **Preview before action.** Every dry-run response includes a `preview` object that fully describes what would happen if `dryRun: false` were passed.
5. **Least-privilege scopes.** OAuth scopes are added incrementally as new capabilities are introduced, not pre-emptively.
6. **No sensitive bodies in history.** Run history records strip message bodies, snippets, and payload parts. Only metadata (id, threadId, subject, from, to, date, labelIds) is preserved.
7. **Input validation.** All tool inputs are validated via `zod` before reaching the adapter. This prevents injection via crafted query strings and malformed IDs.
8. **Structured errors.** No raw stack traces or internal state are returned to MCP clients.
9. **Explicit scope escalation.** Adding `gmail.send` or `gmail.modify` scope requires a deliberate config change and a new OAuth consent flow, not automatic expansion.

### Write operation risk tiers

| Tier | Operations | Default behavior |
|---|---|---|
| **Low** | `mark_read`, `mark_unread`, `apply_labels`, `remove_labels` | Reversible; dry-run default |
| **Medium** | `archive`, `create_draft`, `update_draft`, `create_reply_draft` | Reversible or draft-only; dry-run default |
| **High** | `trash` | Soft-delete; reversible within 30 days; dry-run default; explicit confirm recommended |
| **Critical** | `send_draft` | Irreversible; dry-run default; explicit `dryRun: false` required; preview mandatory |

---

## 9. Storage / History Model

### Run history

- Location: `~/.gmail-mcp/history.jsonl`
- Format: newline-delimited JSON (one `RunRecord` per line)
- Written: after every tool call (async, non-blocking)
- Maximum size: 10 000 records (oldest pruned automatically)
- Sensitive fields stripped before write (see Phase 5)

### Local Markdown snapshots (opt-in)

- Disabled by default.
- When `GMAIL_MCP_SNAPSHOTS=true`, `gmail_read_message` and `gmail_read_thread` write sanitized Markdown snapshots to `~/.gmail-mcp/snapshots/<date>/<id>.md`.
- Snapshots include subject, from, to, date, plain-text body only — no attachments, no raw MIME.

### No external storage

- No SQLite, no hosted database, no cloud sync.
- All state is local and user-owned.

---

## 10. Deferred Work

The following are intentionally out of scope for the MVP and recorded here to avoid scope creep:

| Feature | Reason deferred |
|---|---|
| Multi-account support | Adds auth complexity; single account proves the pattern |
| Attachment download / upload | Requires binary handling and storage decisions |
| Full HTML email rendering | Scope and security complexity |
| Pagination cursor management across sessions | Stateful; deferred to Phase 6+ |
| Background sync / watch (Gmail Push Notifications) | Requires hosted endpoint; out of local-first scope |
| Vector search over email content | Unnecessary for MVP; adds large dependencies |
| Electron UI | Explicitly deferred |
| Workflow engine with state machine | Over-engineering for MVP |
| Google Workspace domain-wide delegation | Enterprise feature; separate OAuth setup |
| S/MIME or PGP signed/encrypted mail | Specialized and complex |
| Calendar / Drive integration | Out of Gmail scope |
| Token sharing across multiple local apps | Security model complexity |
| Email export / backup | Separate tool concern |

---

## 11. Risks and Limitations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Gmail API quota exhaustion (250 quota units/user/second) | Medium | High | Local rate limiter + retry with backoff (Phase 7) |
| OAuth token revoked by user or Google policy | Medium | High | Detect 401, surface clear re-auth message via `gmail_diagnostics` |
| `gmail.modify` scope rejected by Google verification | Low | High | Use `gmail.readonly` + `gmail.compose` for unverified apps; `gmail.modify` requires Google OAuth verification for production |
| Model sends email without user review | Low | Critical | `dryRun: true` default; explicit `dryRun: false` required; preview in dry response |
| Sensitive email content in logs | Medium | High | Strict field-stripping in `RunHistoryWriter` |
| Large thread / attachment payloads causing memory issues | Medium | Medium | Enforce `maxResults`, lazy-load parts, no attachment body download in MVP |
| MCP SDK breaking changes | Low | Medium | Pin SDK version; track changelog |
| Path traversal via `skills_read` resource name | Low | Low | Validate skill name against allowlist of known files |

---

## 12. Exit Criteria per Phase

### Phase 0

- [ ] `npm run build` completes with zero TypeScript errors.
- [ ] `npm run lint` passes.
- [ ] `npm test` runs and passes a smoke test.
- [ ] `.gitignore` excludes `token.json`, `credentials.json`, `dist/`, `node_modules/`.

### Phase 1

- [ ] `authorize()` completes OAuth flow and saves token on first run.
- [ ] `LabelService.listLabels()` returns all labels for the authenticated account.
- [ ] `MessageService.searchMessages("in:inbox")` returns ≥ 1 result.
- [ ] `MessageService.getMessage(id)` returns a `MessageDetail` with subject, from, date, and plain-text body.
- [ ] `ThreadService.getThread(id)` returns all messages in a thread.
- [ ] `DraftService.createDraft(payload, dryRun: true)` returns a preview without creating a draft.
- [ ] `DraftService.createDraft(payload, dryRun: false)` creates a real draft visible in Gmail.
- [ ] `StateService.archiveMessage(id, dryRun: true)` returns preview without modifying message.
- [ ] Unit tests pass with mocked googleapis.

### Phase 2

- [ ] `cli auth login` opens browser and saves token.
- [ ] `cli auth status` prints expiry and scopes.
- [ ] `cli labels list` prints label list matching Gmail UI.
- [ ] `cli messages search "in:inbox"` prints summaries.
- [ ] `cli messages read <id>` prints message detail.
- [ ] `cli draft create --dry-run` prints draft preview, creates no draft.
- [ ] `cli draft send <id> --dry-run` prints send preview, sends nothing.
- [ ] `cli draft send <id> --confirm` sends the draft.

### Phase 3

- [ ] `npm run mcp` starts the MCP server without errors.
- [ ] Claude Desktop connects and calls `gmail_diagnostics` successfully.
- [ ] `gmail_list_labels` returns labels in Claude Desktop.
- [ ] `gmail_search` with `query: "in:inbox"` returns results in Claude Desktop.
- [ ] `gmail_read_message` returns a readable message in Claude Desktop.
- [ ] `gmail_create_draft` with default `dryRun: true` returns a preview (no draft created).
- [ ] `gmail_send_draft` with `dryRun: true` returns a preview (nothing sent).
- [ ] All tool errors return structured JSON, not raw exceptions.

### Phase 4

- [ ] All nine skill `.md` files exist and parse without errors.
- [ ] `skills_list` MCP resource returns all nine skill summaries.
- [ ] `skills_read` for any valid skill name returns full Markdown.
- [ ] `workflow_preview` for `inbox-triage` returns ≥ 3 steps with tool names.
- [ ] `cli skills list` and `cli skills read <name>` print correct output.

### Phase 5

- [ ] Every tool call appends a `RunRecord` to `~/.gmail-mcp/history.jsonl`.
- [ ] `RunRecord` contains no message body content.
- [ ] `cli history list` prints last 20 records in a readable table.
- [ ] `cli history clear --confirm` empties the history file.
- [ ] History file is pruned to 10 000 records automatically.

### Phase 6

- [ ] `workflow_preview` returns ordered steps with `estimatedInputs` for all nine skills.
- [ ] `gmail_diagnostics` returns `recentRunCount` from history.
- [ ] `--preview` flag on all CLI write commands prints a workflow preview before prompting for confirmation.
- [ ] `docs/skills-authoring.md` is written and reviewed.

### Phase 7

- [ ] Security audit completed; findings resolved or documented.
- [ ] All Gmail API errors classified and return typed error objects.
- [ ] Rate limiter active; no quota errors under normal usage.
- [ ] Unit test coverage ≥ 80% across adapter services.
- [ ] Integration guides written for Claude Desktop, Claude Code, GitHub Copilot, Cursor.
- [ ] `v1.0.0` tag applied.
- [ ] `README.md` updated with quick-start, config reference, and tool table.
