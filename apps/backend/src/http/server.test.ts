import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { mkdtempSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { makeServer } from './server.js';
import { resolveVaultPaths } from '../config/paths.js';
import { openDb } from '../db/client.js';
import { runMigrations } from '../db/migrate.js';
import { FakeEmbedder } from '../embeddings/embedder.js';
import { Indexer } from '../index/indexer.js';
import { IndexRepo } from '../index/repo.js';
import { IngestService } from '../ingest/service.js';
import { Registry } from '../tools/registry.js';
import type { ReadyDeps } from './bootstrap.js';
import type { ChatEvent, ChatOpts, ConfigDto, ProviderAdapter } from '@sanji/shared';
import type { Skill } from '../skills/parse.js';

describe('makeServer', () => {
  it('serves /health with the version', async () => {
    const handle = makeServer({ kind: 'no-vault' });
    const res = await handle.app.request('/health');
    expect(res.status).toBe(200);
    const body = await res.json() as { status: string; service: string; version: string };
    expect(body.status).toBe('ok');
    expect(body.service).toBe('sanji-backend');
    expect(typeof body.version).toBe('string');
  });

  it('serves the root marketing line', async () => {
    const handle = makeServer({ kind: 'no-vault' });
    const res = await handle.app.request('/');
    expect(res.status).toBe(200);
    expect(await res.text()).toMatch(/sanji backend/i);
  });
});

class StubAdapter implements ProviderAdapter {
  async *chat(_o: ChatOpts): AsyncIterable<ChatEvent> {
    yield { type: 'message_stop', usage: { input: 0, output: 0 } };
  }
  async getAvailableModels() { return []; }
  async testCredentials() { return { ok: true as const }; }
}

function buildTestReadyDeps(dir: string): ReadyDeps {
  const paths = resolveVaultPaths(dir);
  mkdirSync(paths.sanjiDir, { recursive: true });
  const db = openDb(paths.indexDb);
  runMigrations(db);
  const repo = new IndexRepo(db);
  const embedder = new FakeEmbedder();
  const adapter = new StubAdapter();
  const ingestSkill: Skill = {
    name: 'ingest', trigger: '/ingest', description: '', body: 'b',
    source: 'inline', tools: undefined, model: undefined,
  };
  const indexer = new Indexer(db, embedder, { chunkSizeTokens: 500, chunkOverlapTokens: 50 });
  const ingestService = new IngestService({ paths, repo, adapter, model: 'sonnet', ingestSkill, indexer });
  const cfg: ConfigDto = {
    provider: { mode: 'claude-code' },
    models: { default: 'sonnet', heavy: 'opus' },
    calendar: { urls: [], pollIntervalMinutes: 5 },
    search: { tavilyApiKey: '' },
    indexing: { chunkSizeTokens: 500, chunkOverlapTokens: 50, embeddingModel: 'fake' },
    ingestion: { contextualRetrieval: false },
    ui: { theme: 'auto', mascot: 'chatty' },
    chat: { autoClearThreshold: 0.75, autoClearIdleMinutes: 30 },
  };
  return {
    kind: 'ready', paths, cfg, db, repo, embedder, adapter,
    registry: new Registry(), skills: [ingestSkill], ingestService, indexer,
    maxUploadBytes: 1024 * 1024,
  };
}

describe('makeServer ready→ready swap teardown', () => {
  let dirA: string;
  let dirB: string;
  beforeEach(() => {
    dirA = mkdtempSync(join(tmpdir(), 'sanji-server-a-'));
    dirB = mkdtempSync(join(tmpdir(), 'sanji-server-b-'));
  });
  afterEach(() => {
    rmSync(dirA, { recursive: true, force: true });
    rmSync(dirB, { recursive: true, force: true });
  });

  it('defers teardown of old ready deps until in-flight body streams finish', async () => {
    const events: string[] = [];
    const oldDeps = buildTestReadyDeps(dirA);
    const newDeps = buildTestReadyDeps(dirB);
    const handle = makeServer(oldDeps, {
      onBeforeTeardown: () => events.push('teardown'),
    });

    // Open a request against the OLD generation; keep the body unread so
    // the TransformStream wrapper around the response doesn't close. The
    // proxy increments inflight on entry and only decrements when the
    // body stream flushes — by holding onto the response without consuming
    // it, we hold inflight at 1.
    const res = await handle.app.request('/health');
    expect(res.status).toBe(200);

    // Trigger the swap; capture the returned promise so we can assert on
    // its resolution timing.
    const swapDone = handle.swap(newDeps);

    // Race against a 100ms timer: swapDone must NOT resolve while the
    // body is unread. We tag whichever wins.
    const first = await Promise.race([
      swapDone.then(() => 'swap'),
      new Promise<string>((r) => setTimeout(() => r('timer'), 100)),
    ]);
    expect(first).toBe('timer');
    expect(events).toEqual([]);

    // Now drain the body — that closes the TransformStream, decrements
    // inflight, and the poll loop fires teardown.
    await res.text();
    await swapDone;
    expect(events).toEqual(['teardown']);

    // Tear down the new generation cleanly so sqlite releases its file
    // handles before the test's tmpdir afterEach unlinks them.
    await handle.swap({ kind: 'no-vault' });
  });

  it('falls back to a hard timeout if drain never happens', async () => {
    // Hold a response body open forever by never reading from it.
    // scheduleTeardown's hard-stop timer (30s) must eventually fire teardown.
    vi.useFakeTimers();
    try {
      const events: string[] = [];
      const oldDeps = buildTestReadyDeps(dirA);
      const handle = makeServer(oldDeps, {
        onBeforeTeardown: () => events.push('teardown'),
      });
      // Real timers needed to dispatch the request; flip after.
      vi.useRealTimers();
      const res = await handle.app.request('/health');
      expect(res.status).toBe(200);
      vi.useFakeTimers();

      const swapDone = handle.swap({ kind: 'no-vault' });
      // Advance past the hard-stop window.
      await vi.advanceTimersByTimeAsync(31_000);
      vi.useRealTimers();
      await swapDone;
      expect(events).toEqual(['teardown']);

      // Drain leftover so the body wrapper doesn't keep the readable open.
      await res.text();
    } finally {
      vi.useRealTimers();
    }
  });
});
