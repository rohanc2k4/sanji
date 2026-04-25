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

## License

MIT. See `LICENSE`.
