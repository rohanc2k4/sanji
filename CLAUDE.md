# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Sanji is a local AI study buddy that reads a user's markdown vault, indexes it, and answers questions with semantic citations. It uses the Claude Agent SDK against the user's Pro/Max subscription (with an Anthropic API fallback). Status: v0.1, in active development; see `NEXT_SESSION.md` for week-by-week state.

## Commands

Repo is a pnpm workspace; Node ≥20, pnpm 9.15 via corepack.

- `pnpm install` — bootstrap (run `corepack enable` first).
- `pnpm dev` — runs every workspace's `dev` in parallel: backend on `:8080`, frontend on `:5173`.
- `pnpm build` / `pnpm typecheck` / `pnpm test` — recursive across workspaces.
- Backend-only: `pnpm --filter @sanji/backend test`, `... typecheck`, `... dev`.
- Single test file: `pnpm --filter @sanji/backend exec vitest run src/path/to/file.test.ts`.
- Single test name: `... vitest run -t "name pattern"`. Watch mode: `pnpm --filter @sanji/backend test:watch`.
- Lint script is a stub (`echo 'lint not configured yet'`) — there is no linter wired up.

### CLI harness (`apps/backend/src/cli.ts`)

The backend ships a `sanji` CLI for exercising indexing + agent without the UI. All subcommands take `--vault <path>`:

```
pnpm --filter @sanji/backend sanji -- --vault ~/notes init
pnpm --filter @sanji/backend sanji -- --vault ~/notes index
pnpm --filter @sanji/backend sanji -- --vault ~/notes search "query"
pnpm --filter @sanji/backend sanji -- --vault ~/notes ssearch "query"
pnpm --filter @sanji/backend sanji -- --vault ~/notes ask "/ask what is X?"
```

Useful env flags for tests/dev:
- `SANJI_FAKE_EMBED=1` — swap `TransformersEmbedder` for `FakeEmbedder` (no model download).
- `SANJI_OFFLINE_FAKE_LLM=1` — swap the provider adapter for an offline stub.

## Architecture

Three workspaces: `apps/backend` (Hono + better-sqlite3 + sqlite-vec + transformers.js), `apps/frontend` (React 19 + Vite, currently a placeholder shell), `packages/shared` (Zod schemas + types consumed by both).

### Vault model

A "vault" is a user-owned directory of markdown files. Sanji writes alongside it under `<vault>/.sanji/` (config.toml, index.db, skills/, versions/, model-cache/). All paths derive from `resolveVaultPaths()` in `apps/backend/src/config/paths.ts` — never hard-code subpaths elsewhere.

### Backend boot states (`apps/backend/src/http/deps.ts`)

`makeServer(deps)` accepts a `ServerDeps` discriminated union:
- `kind: 'no-vault'` — only `/health` and `/api/onboarding/*` mount. Used at first launch before a vault is configured.
- `kind: 'ready'` — full server: `config`, `vault`, `notes`, `chat` routes mount, all sharing the same `db`, `paths`, `repo`, `embedder`, `adapter`, `registry`, and loaded `skills`.

`apps/backend/src/index.ts` currently boots in `'no-vault'` mode; the onboarding flow promotes to `'ready'`.

### Indexing pipeline

`vault/watcher.ts` (chokidar) → `vault/parse.ts` (gray-matter frontmatter) → `vault/chunk.ts` → `embeddings/*` → `index/indexer.ts` → `index/repo.ts` writes through to SQLite (`db/migrate.ts` defines schema: `notes_fts` FTS5 table, `chunks` sqlite-vec table, plus operational tables). `IndexRepo.knnChunks(vec, n)` is the canonical semantic-search query.

Embedders implement the `Embedder` interface (`embeddings/embedder.ts`); `TransformersEmbedder` runs `@xenova/transformers` in a worker thread (`embeddings/worker.ts`). Tests use `FakeEmbedder`.

### Provider adapters

`ProviderAdapter` (defined in `@sanji/shared`) is implemented twice: `llm/claude-code-sdk.ts` (subscription auth via `@anthropic-ai/claude-agent-sdk`) and `llm/anthropic-api.ts` (API-key fallback). `llm/factory.ts:makeAdapter(cfg)` picks based on `config.toml`. The adapter exposes `chat({model, system, messages, tools, toolHandler})` returning an `AsyncIterable<ChatEvent>` (text deltas, tool-use events, message_stop). All UI/SSE/CLI streaming is built on this event shape — preserve it when adding new adapters.

### Skills + tools + agent

A "skill" is a markdown file (frontmatter + body) loaded from `apps/backend/src/skills/builtin/*.md` and the user's `<vault>/.sanji/skills/`. `skills/parse.ts` parses frontmatter (name, trigger, optional `model`, optional `tools` allowlist). `skills/match.ts` selects a skill from the user's message (typically `/skill-name args`).

`tools/registry.ts:Registry` holds tool definitions (`read-note`, `search-vault`, `semantic-search`, `get-neighbors`, `write-note`). Each tool gets a shared `ToolContext` (`paths`, `db`, `repo`, `embedder`). If a skill declares `tools: [...]`, the registry is filtered to that allowlist before being passed to the adapter.

`agent/run.ts:runAgent(deps, message)` is the central loop: match skill → filter tools → stream `adapter.chat(...)` → yield `ChatEvent`s → return `{ skill, toolCalls }` stats. Both the CLI (`cli.ts`) and the HTTP `/api/chat` route consume this same generator — keep them aligned when changing the agent contract.

### HTTP layer

Routes live in `apps/backend/src/http/routes/*.ts` and are mounted by `http/server.ts`. SSE helpers are in `http/sse.ts`; DTOs in `http/dto.ts`. Path validation that crosses the vault boundary should reuse the shared validator under `tools/validation.ts` (used by `read-note`, `write-note`, and the notes route — keep this single source of truth).

### Shared package

`@sanji/shared` exports Zod schemas + inferred types: `config.ts` (TOML config schema), `notes.ts`, `llm.ts` (provider/event types), `api.ts` (HTTP DTOs). Workspace dependents import from `@sanji/shared`; **add new cross-cutting types here**, not in the consumer.

## Conventions

- TypeScript ESM throughout — internal imports use the `.js` extension on relative paths (e.g. `from './foo.js'`) even though the source is `.ts`. This is required by Node's ESM resolver; do not drop it.
- Tests are colocated as `*.test.ts` next to the unit, run with Vitest.
- The project is pre-1.0; backwards compatibility is not a constraint. Prefer changing call sites over adding shims.
