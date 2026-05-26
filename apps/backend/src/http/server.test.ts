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

  it('defers background teardown of old ready deps until in-flight body streams finish', async () => {
    const events: string[] = [];
    const oldDeps = buildTestReadyDeps(dirA);
    const newDeps = buildTestReadyDeps(dirB);
    const handle = makeServer(oldDeps, {
      onBeforeTeardown: () => events.push('teardown'),
    });

    // Open a request against the OLD generation; keep the body unread so
    // the TransformStream wrapper around the response doesn't close.
    const res = await handle.app.request('/health');
    expect(res.status).toBe(200);

    // Trigger the swap. swap() itself resolves immediately (no longer
    // awaits drain — that would deadlock the initiating request against
    // its own inflight count). Teardown runs in the background.
    await handle.swap(newDeps);
    const teardownDone = handle.awaitLastTeardown();
    expect(teardownDone).not.toBeNull();

    // Race teardownDone against a 100ms timer: teardown MUST NOT fire
    // while the body is unread.
    const first = await Promise.race([
      teardownDone!.then(() => 'teardown'),
      new Promise<string>((r) => setTimeout(() => r('timer'), 100)),
    ]);
    expect(first).toBe('timer');
    expect(events).toEqual([]);

    // Drain the body → TransformStream flushes → inflight=0 → teardown fires.
    await res.text();
    await teardownDone;
    expect(events).toEqual(['teardown']);

    // Tear down the new generation cleanly so sqlite releases its file
    // handles before the test's tmpdir afterEach unlinks them.
    await handle.swap({ kind: 'no-vault' });
    await handle.awaitLastTeardown();
  });

  it('does not deadlock when the initiating request is itself counted in old inflight', async () => {
    // Regression: previously doSwap awaited scheduleTeardown(previous);
    // because the proxy bumps inflight for the request that calls swap,
    // the await never resolved until the 30s hard-stop and then closed
    // old deps under live sibling requests. swap() must return promptly
    // even when inflight > 0 on the retired generation.
    const oldDeps = buildTestReadyDeps(dirA);
    const handle = makeServer(oldDeps, { onBeforeTeardown: () => {} });

    // Keep an unread response open against the old generation.
    const stuck = await handle.app.request('/health');
    expect(stuck.status).toBe(200);

    // swap() must resolve quickly even though stuck.body is still alive
    // and inflight > 0. Race against a generous timeout.
    const swap = handle.swap({ kind: 'no-vault' });
    const result = await Promise.race([
      swap.then(() => 'ok'),
      new Promise<string>((r) => setTimeout(() => r('timeout'), 1_000)),
    ]);
    expect(result).toBe('ok');

    // Drain so the body wrapper closes cleanly and the new generation
    // can tear down sqlite in afterEach.
    await stuck.text();
    await handle.awaitLastTeardown();
  });

  it('falls back to a hard timeout if drain never happens', async () => {
    vi.useFakeTimers();
    try {
      const events: string[] = [];
      const oldDeps = buildTestReadyDeps(dirA);
      const handle = makeServer(oldDeps, {
        onBeforeTeardown: () => events.push('teardown'),
      });
      vi.useRealTimers();
      const res = await handle.app.request('/health');
      expect(res.status).toBe(200);
      vi.useFakeTimers();

      await handle.swap({ kind: 'no-vault' });
      const teardownDone = handle.awaitLastTeardown();
      await vi.advanceTimersByTimeAsync(31_000);
      vi.useRealTimers();
      await teardownDone;
      expect(events).toEqual(['teardown']);
      await res.text();
    } finally {
      vi.useRealTimers();
    }
  });
});
