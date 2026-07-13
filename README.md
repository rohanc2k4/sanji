# Sanji 🐈

Meet Sanji: your open-source, free-to-use AI study buddy. Sanji reads your markdown notes, plans your day, answers questions with semantic citations, and lets you add new skills by dropping a markdown file. Uses your existing Claude Code subscription via the Claude Agent SDK, so it costs nothing extra to run.

> **Status:** v0.1 in development. Not yet runnable end-to-end. See `NEXT_SESSION.md` for current state and next steps.

## Features (v0.1 target)

- Markdown vault on your disk; Sanji indexes alongside without moving files.
- Chat-primary UI with streaming responses and live tool-call status.
- Five built-in skills: `/daily`, `/recap`, `/ask`, `/connect`, `/research`.
- Drop your own skills as markdown files in `<vault>/.sanji/skills/`.
- Semantic search via local in-process embeddings (no extra API key for retrieval).
- Calendar planning from `.ics` feeds (read-only) plus optional `.ics` block export.
- Orange tabby mascot in the corner because why not.
- MIT, runs in Docker.

## Sources sidebar

Create, rename, move, and delete notes and folders directly inside Sanji:

- Hover a row for inline actions: rename and delete on any item; folders also get a "+" to add a note or subfolder inside.
- Drag notes or folders between locations to reorganize. The vault on disk reflects every move.
- Deletions are soft. Notes and folders move to `.sanji/trash/` under their original relative path. To clear trash permanently, run `rm -rf .sanji/trash/` in your vault.
- "New folder" stays in memory until you add the first note. Reload before adding anything and the empty folder disappears (nothing was written to disk).

## Quickstart (when v0.1 ships)

```bash
git clone https://github.com/rohanc2k4/sanji
cd sanji
cp .env.example .env       # set VAULT_PATH=~/notes
docker compose up -d
open http://localhost:8080
```

## Local development

```bash
corepack enable
pnpm install
pnpm dev          # backend on :8080, frontend on :5173
```

Backend: `apps/backend` (Hono + better-sqlite3 + sqlite-vec + transformers.js).
Frontend: `apps/frontend` (React 19 + Vite + CodeMirror 6).
Shared types: `packages/shared` (Zod schemas, used by both).

## How retrieval works

Sanji defaults to agentic search for vaults under ~5000 notes. The agent uses `list_vault` to orient and `grep_vault` to search by pattern, then reads matching notes via `read_note`. It iterates with different patterns if the first pass comes up empty. Same approach Cursor and Claude Code use for codebases.

Above the size threshold, the agent falls back to `hybrid_search`, which fuses BM25 (FTS5) and dense (sqlite-vec) retrieval via Reciprocal Rank Fusion, with optional contextual retrieval and multi-query rewriting on top.

For best grep performance, install ripgrep on your machine:

```bash
# macOS
brew install ripgrep

# Debian/Ubuntu
apt install ripgrep
```

Sanji falls back to a pure-Node regex walker if ripgrep is absent. Slower on large vaults; functionally equivalent.

Contextual retrieval (per-chunk Anthropic-style context blurbs prepended to embedding inputs) is opt-in via `[ingestion] contextual_retrieval = true` in `~/.config/sanji/config.toml`. Defaults off in v0.1 because it sends note bodies to your configured LLM on every index pass.

## Ingestion config

Sanji indexes the markdown vault on disk into a local SQLite + sqlite-vec store at `<vault>/.sanji/index.db`. Settings live in `<vault>/.sanji/config.toml` under `[indexing]` (chunk size, embedding model) and `[ingestion]` (retrieval-time LLM features).

```toml
[ingestion]
# See "How retrieval works" above for the cost/recall tradeoff.
contextual_retrieval = false
```

## License

MIT. See `LICENSE`.
