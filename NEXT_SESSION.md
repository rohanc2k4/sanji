# Next Session Resumption

State of Sanji as of 2026-07-14. Read this first when you pick the project back up.

## Where things are

- Code: `~/Dev_Projects/sanji` (this repo). Remote: `https://github.com/rohanc2k4/sanji`.
- Project tracking: `~/Dev_Projects/executive-assistant/projects/personal/sanji/README.md`.
- Canonical spec: `~/Dev_Projects/executive-assistant/docs/superpowers/specs/2026-04-25-sanji-v0.1-design.md` (with a 2026-05-05 reposition note at the top: v0.1 is a localhost study buddy, EA features moved to v0.3).

## Branch map

Everything active happens on `feat/v0.1-consolidation`. It is the integration line for v0.1 and carries every phase plus current dependencies.

- `main` (`b58ed6c`): Phases 1 to 5. Last moved by the dependency bumps below.
- `feat/v0.1-ship`: Claude-CLI onboarding guide + Phase 6 sidebar CRUD. Fully merged into consolidation, kept until consolidation lands.
- `feat/mascot-polish`: Phase 7 mascot + KaTeX math rendering in replies + faster onboarding flight. Fully merged into consolidation, kept until consolidation lands.
- `feat/v0.1-consolidation`: `feat/v0.1-ship` + `feat/mascot-polish` + main (zod 4, better-sqlite3 12). This is where Phase 8 gets built.

Do not branch new work off `main`. Branch off `feat/v0.1-consolidation`.

## What is done

Phases 1 through 7 are code complete. Vault indexer, agent loop with five vault tools, backend HTTP API, React shell, onboarding, multi-format ingestion with the bundled rewrite skill, RAG plus agentic search, the sidebar CRUD, and the hand-rendered canvas mascot all shipped. The whole thing is green on the consolidation branch: typecheck clean, 535 unit tests (13 shared, 196 frontend, 326 backend), 3 Playwright E2E specs.

Dependencies are current as of 2026-07-14: zod 4.4.3 (needed one code change, an explicit key schema in `z.record` in `packages/shared/src/notes.ts`), better-sqlite3 12.11.1 (drop-in), and the weekly dependabot minor and patch group. No open PRs, no stale branches.

## What is next

1. **Phase 8: marketing site + product video at sanji.dev.** The domain is locked on Namecheap since 2026-05-06. Single-page site (hero with the polished mascot, embedded product video, feature highlights, OS-detected download buttons that start as Docker for v0.1, GitHub link, FAQ), hosted on Vercel or Cloudflare Pages. Plus a 60 to 90 second screen recording of the headline flow: drop a PDF, ask a question, run a quiz. Build this on the consolidation branch.
2. **Deferred codex review pass.** One codex cycle over the full v0.1 diff against main. Deferred on 2026-05-26 to amortize quota across the whole release rather than per-phase. Run it once Phase 8 lands so it covers everything at once.
3. **Merge consolidation to main, then launch.** Open-source MIT, Docker install, Show HN post, LinkedIn post.

## Launch-prep checklist (do before the public launch)

- Skim the Anthropic acceptable-use policy to confirm a subscription-funded localhost open-source app is in spirit. Heavy ingestion against the subscription path may hit per-account fair-use limits.
- Pin Pro and Max plan rate limits in the README so heavy ingestion users are not surprised.
- Confirm sqlite-vec multi-arch packaging for the Docker image (linux/amd64 and linux/arm64). Fallback is BLOB storage plus JS cosine.
- Assemble the ingest-eval corpus (at least 10 real academic PDFs) and run the harness at `apps/backend/scripts/ingest-eval.ts` to check the rewrite prompt against real source variety.
- Name availability sweep: npm `sanji`, GitHub org, `sanji.dev` and `sanji.app` domains.

## How to run

```bash
cd ~/Dev_Projects/sanji
corepack enable
pnpm install
pnpm dev                  # backend on :8080, frontend on :5173
```

Verify:

```bash
pnpm -r typecheck
pnpm -r test              # 535 unit tests
cd apps/frontend && CI=1 pnpm test:e2e   # 3 specs; run playwright install chromium once if browsers are missing
```
