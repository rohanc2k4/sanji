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

## Ingestion config

Sanji indexes the markdown vault on disk into a local SQLite + sqlite-vec store at `<vault>/.sanji/index.db`. Settings live in `<vault>/.sanji/config.toml` under `[indexing]` (chunk size, embedding model) and `[ingestion]` (retrieval-time LLM features).

```toml
[ingestion]
# Anthropic-style contextual retrieval. When true, every changed chunk is sent
# to the configured LLM along with the full parent note body to generate a
# short context blurb. The blurb is concatenated into the embedded text and
# stored on the chunk row, which lifts retrieval recall on chunked notes.
#
# Cost: one LLM call per chunk per index pass against the configured provider
# (Anthropic API key or Claude Code subscription). Note bodies are sent to the
# provider, so do not enable on a vault you do not want to send out.
#
# Default in v0.1: false. Flip to true if you want the recall lift and accept
# the cost and data-egress tradeoff. There is no UI surface for this in v0.1
# (file-only); v0.2 will add a settings drawer.
contextual_retrieval = false
```

## License

MIT. See `LICENSE`.
