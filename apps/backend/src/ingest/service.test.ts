import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync, existsSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { resolveVaultPaths } from '../config/paths.js';
import { openDb } from '../db/client.js';
import { runMigrations } from '../db/migrate.js';
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

function setup() {
  const paths = resolveVaultPaths(dir);
  mkdirSync(paths.sanjiDir, { recursive: true });
  const db = openDb(paths.indexDb);
  runMigrations(db);
  const repo = new IndexRepo(db);
  const adapter = new ScriptedAdapter();
  const service = new IngestService({
    paths, repo, adapter, model: 'sonnet', ingestSkill,
  });
  return { service, paths, db, adapter };
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
