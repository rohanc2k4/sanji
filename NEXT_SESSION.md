# Next Session Resumption

When you (Rohan) re-open the executive-assistant Claude session, this is the state of Sanji.

## Where to find things

- **Spec (canonical):** `~/Desktop/executive-assistant/docs/superpowers/specs/2026-04-25-sanji-v0.1-design.md`
- **Project tracking:** `~/Desktop/executive-assistant/projects/personal/sanji/README.md`
- **Code (this repo):** `~/Dev_Projects/sanji`
- **Remote:** `https://github.com/rohanc2k4/sanji`

## What is done

- Spec written, self-reviewed, approved, committed (executive-assistant repo `3a43a9c`).
- Dev tools installed at user scope: frontend-design plugin, Playwright MCP, Chrome DevTools MCP, Context7 MCP. (GitHub MCP deferred to week 5.)
- Repo bootstrapped: monorepo (pnpm workspaces), TypeScript everywhere, Hono backend stub, React 19 + Vite frontend stub, Zod-ready shared package, Dockerfile + docker-compose.yml, MIT LICENSE.
- `pnpm install` run, lockfile committed.

## What is next (per spec timeline)

Week 1 of build (still ahead):

1. Vault watcher (chokidar) wired up against a configurable vault path.
2. Indexer pipeline: file change → markdown parse → chunk → embed → upsert into SQLite.
3. SQLite schema with Drizzle migrations (notes FTS5 table, chunks sqlite-vec table, wikilinks table, operational tables).
4. ProviderAdapter interface + ClaudeCodeSDKAdapter implementation (subscription auth via Claude Agent SDK, with AnthropicApiAdapter as fallback).
5. CLI test harness so we can exercise the indexer + LLM loop without the UI yet.

The brainstorming skill flow says the next step is invoking `superpowers:writing-plans` to break the spec into a sequenced implementation plan with TDD discipline before week 1 work starts. Recommend doing that at the top of the next session: `/writing-plans` (or whatever the invocation is).

## How to run what exists

```bash
cd ~/Dev_Projects/sanji
corepack enable
pnpm install
pnpm dev          # backend on :8080 (GET /health), frontend on :5173 (placeholder shell)
```

Verify:
- `curl http://localhost:8080/health` returns `{"status":"ok","service":"sanji-backend","version":"0.0.1"}`
- `open http://localhost:5173` shows the "Sanji 🐈 v0.0.1 in development" placeholder

## Open verifications from the spec (do during build phase)

1. Confirm Claude Agent SDK exposes Pro/Max OAuth credentials from a third-party Node app (fallback: shell out to `claude` CLI as subprocess).
2. Skim Anthropic acceptable-use policy before publishing to confirm subscription-funded localhost open-source app is in spirit.
3. Name availability: npm `sanji`, GitHub org `sanji`, `sanji.dev` / `sanji.app` domains, App Store collisions.
4. Pin Pro/Max plan rate limits in README so heavy `/research` users are not surprised.
5. `sqlite-vec` extension multi-arch packaging (linux/amd64 and linux/arm64). Fallback: BLOB storage + JS cosine.
