import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync, existsSync, readFileSync } from 'node:fs';
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
    // The original is parked at the safe sanitized path...
    const safeOriginal = join(paths.vault, '.sanji/originals/escape.md');
    expect(existsSync(safeOriginal)).toBe(true);
    // ...and definitely not above the vault root.
    expect(existsSync(join(paths.vault, '../../../escape.md'))).toBe(false);
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
