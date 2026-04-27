import { describe, expect, it } from 'vitest';
import { mkdtempSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runAgent } from './run.js';
import { Registry } from '../tools/registry.js';
import { readNoteTool } from '../tools/read-note.js';
import { searchVaultTool } from '../tools/search-vault.js';
import { semanticSearchTool } from '../tools/semantic-search.js';
import { getNeighborsTool } from '../tools/get-neighbors.js';
import { writeNoteTool } from '../tools/write-note.js';
import { resolveVaultPaths } from '../config/paths.js';
import { loadSkills } from '../skills/loader.js';
import type { ChatEvent, ChatOpts, ProviderAdapter } from '@sanji/shared';
import type { ToolContext } from '../tools/types.js';

class ScriptedAdapter implements ProviderAdapter {
  constructor(private events: ChatEvent[]) {}
  async *chat(_opts: ChatOpts): AsyncIterable<ChatEvent> {
    for (const e of this.events) yield e;
  }
  async getAvailableModels() { return []; }
  async testCredentials() { return { ok: true }; }
}

describe('agent integration', () => {
  it('end-to-end smoke: skill match → registry → tool round-trip → text → stop', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'sanji-int-'));
    mkdirSync(join(dir, '.sanji', 'skills'), { recursive: true });
    const paths = resolveVaultPaths(dir);
    const { skills, errors } = await loadSkills(paths);
    expect(errors).toEqual([]);
    expect(skills.length).toBeGreaterThan(0); // built-ins should be present

    const registry = new Registry();
    registry.register(readNoteTool);
    registry.register(searchVaultTool);
    registry.register(semanticSearchTool);
    registry.register(getNeighborsTool);
    registry.register(writeNoteTool);

    const adapter = new ScriptedAdapter([
      { type: 'tool_use_complete', id: 't1', name: 'read_note', input: { path: 'a.md' } },
      { type: 'tool_result', id: 't1', content: '{"path":"a.md","title":null,"frontmatter":null,"body":"..."}' },
      { type: 'text_delta', text: 'ok' },
      { type: 'message_stop' },
    ]);

    const ctx = { paths, db: null, repo: null, embedder: null } as unknown as ToolContext;

    const events: ChatEvent[] = [];
    const stream = runAgent(
      { adapter, registry, ctx, skills, defaultModel: 'claude-sonnet-4-6' },
      '/ask anything',
    );
    let stats: { skill: string; toolCalls: number } | undefined;
    while (true) {
      const r = await stream.next();
      if (r.done) { stats = r.value; break; }
      events.push(r.value);
    }
    expect(stats?.skill).toBe('ask');
    expect(stats?.toolCalls).toBe(1);
    expect(events.find((e) => e.type === 'tool_use_complete')).toBeTruthy();
  });
});
