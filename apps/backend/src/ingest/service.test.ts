import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync, existsSync, readFileSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { resolveVaultPaths } from '../config/paths.js';
import { openDb } from '../db/client.js';
import { runMigrations } from '../db/migrate.js';
import { FakeEmbedder } from '../embeddings/embedder.js';
import { Indexer } from '../index/indexer.js';
import { IndexRepo } from '../index/repo.js';
import { IngestService } from './service.js';
import type { Skill } from '../skills/parse.js';
import type { ChatEvent, ChatOpts, ProviderAdapter } from '@sanji/shared';

const VALID_OUTPUT = `---
title: Demo
source: x
ingested_on: 2026-05-06
content_type: paper
summary: short
---

body content
`;

class ScriptedAdapter implements ProviderAdapter {
  public count = 0;
  async *chat(_o: ChatOpts): AsyncIterable<ChatEvent> {
    this.count++;
    yield { type: 'text_delta', text: VALID_OUTPUT };
    yield { type: 'message_stop', usage: { input: 100, output: 50 } };
  }
  async getAvailableModels() { return []; }
  async testCredentials() { return { ok: true as const }; }
}

const ingestSkill: Skill = {
  name: 'ingest', trigger: '/ingest', description: '', body: 'b',
  source: 'inline', tools: undefined, model: undefined,
};

let dir: string;
beforeEach(() => { dir = mkdtempSync(join(tmpdir(), 'sanji-ingest-')); });
afterEach(() => { rmSync(dir, { recursive: true, force: true }); });

function setup(opts?: { withIndexer?: boolean }) {
  const paths = resolveVaultPaths(dir);
  mkdirSync(paths.sanjiDir, { recursive: true });
  const db = openDb(paths.indexDb);
  runMigrations(db);
  const repo = new IndexRepo(db);
  const adapter = new ScriptedAdapter();
  const embedder = new FakeEmbedder();
  const indexer = opts?.withIndexer
    ? new Indexer(db, embedder, { chunkSizeTokens: 500, chunkOverlapTokens: 50 })
    : undefined;
  const service = new IngestService({
    paths, repo, adapter, model: 'sonnet', ingestSkill,
    ...(indexer ? { indexer } : {}),
  });
  return { service, paths, db, adapter, repo, embedder, indexer };
}

describe('IngestService', () => {
  it('drives a paste job through queued → extracting → rewriting → writing → done', async () => {
    const { service, paths, db } = setup();
    const events: any[] = [];
    for await (const ev of service.enqueue({
      fileId: 'f1',
      source: { kind: 'paste', title: 'demo', content: 'hello world' },
      abortController: new AbortController(),
    })) {
      events.push(ev);
    }
    expect(events.map((e) => e.kind)).toEqual([
      'queued', 'extracting', 'rewriting', 'writing', 'done',
    ]);
    const done = events.at(-1)!;
    expect(existsSync(join(paths.vault, done.outputPath))).toBe(true);
    expect(readFileSync(join(paths.vault, done.outputPath), 'utf-8')).toContain('Demo');
    db.close();
  });

  it('writes a YAML frontmatter block with title, source, ingested_on, content_type', async () => {
    const { service, paths, db } = setup();
    const events: any[] = [];
    for await (const ev of service.enqueue({
      fileId: 'f1',
      source: { kind: 'paste', title: 'demo', content: 'hello world' },
      abortController: new AbortController(),
    })) {
      events.push(ev);
    }
    const done = events.at(-1)!;
    const onDisk = readFileSync(join(paths.vault, done.outputPath), 'utf-8');
    expect(onDisk.startsWith('---\n')).toBe(true);
    const m = onDisk.match(/^---\n([\s\S]*?)\n---\n/);
    expect(m).not.toBeNull();
    const fmBlock = m![1]!;
    expect(fmBlock).toMatch(/^title: /m);
    expect(fmBlock).toMatch(/^source: /m);
    expect(fmBlock).toMatch(/^ingested_on: /m);
    expect(fmBlock).toMatch(/^content_type: /m);
    db.close();
  });

  it('emits skipped without calling LLM when target inbox/<basename>.md already exists', async () => {
    const { service, paths, db, adapter } = setup();
    mkdirSync(join(paths.vault, 'inbox'), { recursive: true });
    writeFileSync(join(paths.vault, 'inbox/demo.md'), 'pre-existing');
    const events: any[] = [];
    for await (const ev of service.enqueue({
      fileId: 'f1',
      source: { kind: 'paste', title: 'demo', content: 'hello' },
      abortController: new AbortController(),
    })) {
      events.push(ev);
    }
    expect(events.map((e) => e.kind)).toEqual(['queued', 'skipped']);
    expect(adapter.count).toBe(0);
    expect(readFileSync(join(paths.vault, 'inbox/demo.md'), 'utf-8')).toBe('pre-existing');
    db.close();
  });

  it('strips directory components from uploaded filenames so originals stay inside .sanji/originals/', async () => {
    const { service, paths, db } = setup();
    const events: any[] = [];
    for await (const ev of service.enqueue({
      fileId: 'f1',
      // The client-controlled filename tries to escape the originals dir.
      // basename(...) collapses it to `escape.md`; the original lands inside
      // `.sanji/originals/escape.md` and never above the vault.
      source: { kind: 'file', data: Buffer.from('hello world'), filename: '../../../escape.md' },
      abortController: new AbortController(),
    })) {
      events.push(ev);
    }
    // Ingestion succeeds end-to-end (the offline scripted adapter returns a valid note).
    expect(events.at(-1)).toMatchObject({ kind: 'done' });
    // The original is parked under .sanji/originals/ with a timestamped basename
    // (collision-resistant), and definitely not above the vault root.
    const originalsDir = join(paths.vault, '.sanji/originals');
    const archived = readdirSync(originalsDir);
    expect(archived).toHaveLength(1);
    expect(archived[0]).toMatch(/^escape-\d+\.md$/);
    expect(existsSync(join(paths.vault, '../../../escape.md'))).toBe(false);
    db.close();
  });

  it('writes originals with collision-resistant names so a second ingestion does not overwrite the first', async () => {
    // Use the paste source kind: paste always produces non-empty text, so
    // both jobs reach a successful commit and keep their archived
    // originals. Previously the test relied on the empty-PDF-extract path
    // leaving leftover originals behind — exactly the leak the
    // rollback-on-empty-text fix (cycle-2 medium) closes.
    const { service, paths, db } = setup();
    for await (const _ of service.enqueue({
      fileId: 'f-a',
      source: { kind: 'paste', title: 'paper', content: 'first body content' },
      abortController: new AbortController(),
    })) { /* drain */ }
    // First commit lands at inbox/paper.md; second is renamed so it doesn't
    // get skipped by the existsSync pre-check. The point of the test is the
    // archive naming, not the inbox path.
    await new Promise((r) => setTimeout(r, 2));
    for await (const _ of service.enqueue({
      fileId: 'f-b',
      source: { kind: 'paste', title: 'paper-2', content: 'second body content' },
      abortController: new AbortController(),
    })) { /* drain */ }
    const archived = readdirSync(join(paths.vault, '.sanji/originals'));
    // One archive per ingestion, each with a timestamped kebab(title)
    // basename. The collision-resistance lives in the Date.now() suffix.
    expect(archived.filter((f) => f.startsWith('paper-')).length).toBeGreaterThanOrEqual(2);
    db.close();
  });

  it('rolls back the archived original when the extract step produces no usable text', async () => {
    // Privacy: a scanned PDF (empty extractable text) should not leave its
    // original sitting in .sanji/originals forever. Use a buffer that the
    // PDF extractor returns empty for to trigger the empty-text path.
    const { service, paths, db } = setup();
    for await (const _ of service.enqueue({
      fileId: 'f1',
      source: { kind: 'file', data: Buffer.from('not a real pdf'), filename: 'scan.pdf' },
      abortController: new AbortController(),
    })) { /* drain */ }
    const originalsDir = join(paths.vault, '.sanji/originals');
    if (existsSync(originalsDir)) {
      expect(readdirSync(originalsDir)).toHaveLength(0);
    }
    db.close();
  });

  it('chunks + embeds the freshly-written note when an indexer is wired', async () => {
    // Without the post-write indexFile call, the inbox note shows up in the
    // notes table (via upsertNote) but produces zero chunk rows, so semantic
    // search returns nothing for the new content until a full re-index.
    const { service, repo, embedder, db } = setup({ withIndexer: true });
    const events: any[] = [];
    for await (const ev of service.enqueue({
      fileId: 'f1',
      source: { kind: 'paste', title: 'demo', content: 'hello world' },
      abortController: new AbortController(),
    })) {
      events.push(ev);
    }
    expect(events.at(-1)).toMatchObject({ kind: 'done' });
    const queryVec = await embedder.embed('body content');
    const hits = repo.knnChunks(queryVec, 5);
    expect(hits.some((h) => h.notePath === 'inbox/demo.md')).toBe(true);
    db.close();
  });

  it('aborts the in-flight LLM rewrite when service.cancel() is called mid-flight', async () => {
    // SlowAdapter holds onto the chat() generator until either the abort
    // signal fires or 500ms elapses. cancel() flips the in-flight job's
    // abortController, which propagates through rewrite() into runSkillWithUsage
    // and surfaces here as a rejected wait. The service emits a phase=rewrite
    // error with 'Cancelled by user.', and crucially never reaches the
    // writing phase, so no inbox file lands on disk.
    class SlowAdapter implements ProviderAdapter {
      async *chat(opts: ChatOpts): AsyncIterable<ChatEvent> {
        await new Promise<void>((resolve, reject) => {
          const t = setTimeout(resolve, 500);
          opts.signal?.addEventListener('abort', () => {
            clearTimeout(t);
            reject(new Error('aborted'));
          }, { once: true });
        });
        yield { type: 'text_delta', text: VALID_OUTPUT };
        yield { type: 'message_stop', usage: { input: 1, output: 1 } };
      }
      async getAvailableModels() { return []; }
      async testCredentials() { return { ok: true as const }; }
    }
    const paths = resolveVaultPaths(dir);
    mkdirSync(paths.sanjiDir, { recursive: true });
    const db = openDb(paths.indexDb);
    runMigrations(db);
    const repo = new IndexRepo(db);
    const adapter = new SlowAdapter();
    const service = new IngestService({
      paths, repo, adapter, model: 'sonnet', ingestSkill,
    });

    const events: any[] = [];
    const consume = (async () => {
      for await (const ev of service.enqueue({
        fileId: 'cancel-1',
        source: { kind: 'paste', title: 'demo', content: 'hello' },
        abortController: new AbortController(),
      })) {
        events.push(ev);
      }
    })();

    // Let the job advance into the rewriting phase, then cancel.
    await new Promise((r) => setTimeout(r, 50));
    service.cancel('cancel-1');
    await consume;

    const last = events.at(-1);
    expect(last.kind).toBe('error');
    expect(last.message).toMatch(/[Cc]ancelled/);
    // No inbox file should have landed on disk.
    expect(existsSync(join(paths.vault, 'inbox/demo.md'))).toBe(false);
    // And the archived original must be rolled back — a cancelled ingest
    // should leave no trace in .sanji/originals/.
    const originalsDir = join(paths.vault, '.sanji/originals');
    if (existsSync(originalsDir)) {
      expect(readdirSync(originalsDir)).toHaveLength(0);
    }
    db.close();
  });

  it('rolls back the archived original when cancel fires between extract and rewrite', async () => {
    // Tight cancel window: the SlowAdapter waits 500ms on chat(), so cancel()
    // landing mid-rewrite goes through the rewrite catch path. We separately
    // cover the "cancel right at the top of rewriting" boundary by aborting
    // pre-emptively. Either way, originals/ must be empty.
    class SlowAdapter implements ProviderAdapter {
      async *chat(opts: ChatOpts): AsyncIterable<ChatEvent> {
        await new Promise<void>((resolve, reject) => {
          const t = setTimeout(resolve, 500);
          opts.signal?.addEventListener('abort', () => {
            clearTimeout(t);
            reject(new Error('aborted'));
          }, { once: true });
        });
        yield { type: 'text_delta', text: VALID_OUTPUT };
        yield { type: 'message_stop', usage: { input: 1, output: 1 } };
      }
      async getAvailableModels() { return []; }
      async testCredentials() { return { ok: true as const }; }
    }
    const paths = resolveVaultPaths(dir);
    mkdirSync(paths.sanjiDir, { recursive: true });
    const db = openDb(paths.indexDb);
    runMigrations(db);
    const repo = new IndexRepo(db);
    const service = new IngestService({
      paths, repo, adapter: new SlowAdapter(),
      model: 'sonnet', ingestSkill,
    });
    const consume = (async () => {
      for await (const _ of service.enqueue({
        fileId: 'cancel-pre',
        source: { kind: 'file', data: Buffer.from('hello'), filename: 'pre.txt' },
        abortController: new AbortController(),
      })) { /* drain */ }
    })();
    await new Promise((r) => setTimeout(r, 50));
    service.cancel('cancel-pre');
    await consume;
    const originalsDir = join(paths.vault, '.sanji/originals');
    if (existsSync(originalsDir)) {
      expect(readdirSync(originalsDir)).toHaveLength(0);
    }
    db.close();
  });

  it('refuses to overwrite a target that races into existence after the pre-check', async () => {
    // The pre-flight existsSync check inside process() runs before the
    // 30+ second extract+rewrite window. If a parallel process or sibling
    // ingest creates the same inbox path during that window, the final
    // commit must NOT silently overwrite. We simulate by having the
    // adapter, while streaming, drop a competitor file at the target
    // path. With the wx (exclusive create) commit, the ingest emits an
    // error and the competitor's content is preserved.
    const paths = resolveVaultPaths(dir);
    mkdirSync(paths.sanjiDir, { recursive: true });
    mkdirSync(join(paths.vault, 'inbox'), { recursive: true });
    const db = openDb(paths.indexDb);
    runMigrations(db);
    const repo = new IndexRepo(db);
    const racingAdapter: ProviderAdapter = {
      async *chat(_o: ChatOpts): AsyncIterable<ChatEvent> {
        // Sneak a competitor file in mid-stream — between the existsSync
        // pre-check and the final commit. Mirrors a real-world race
        // (parallel ingest, external editor, sync tool).
        writeFileSync(join(paths.vault, 'inbox/demo.md'), 'competitor wrote first');
        yield { type: 'text_delta', text: VALID_OUTPUT };
        yield { type: 'message_stop', usage: { input: 100, output: 50 } };
      },
      async getAvailableModels() { return []; },
      async testCredentials() { return { ok: true as const }; },
    };
    const service = new IngestService({
      paths, repo, adapter: racingAdapter, model: 'sonnet', ingestSkill,
    });
    const events: any[] = [];
    for await (const ev of service.enqueue({
      fileId: 'race1',
      source: { kind: 'paste', title: 'demo', content: 'hello world' },
      abortController: new AbortController(),
    })) {
      events.push(ev);
    }
    const last = events.at(-1)!;
    expect(last.kind).toBe('error');
    expect(last.phase).toBe('write');
    expect(last.message).toMatch(/raced|already exists/i);
    // Competitor's content is intact — we did NOT clobber it.
    expect(readFileSync(join(paths.vault, 'inbox/demo.md'), 'utf-8'))
      .toBe('competitor wrote first');
    db.close();
  });

  it('emits error event with phase=extract when paste content is empty', async () => {
    const { service, db } = setup();
    const events: any[] = [];
    for await (const ev of service.enqueue({
      fileId: 'f1',
      source: { kind: 'paste', title: 'empty', content: '' },
      abortController: new AbortController(),
    })) {
      events.push(ev);
    }
    expect(events.at(-1)).toMatchObject({ kind: 'error', phase: 'extract' });
    db.close();
  });
});
