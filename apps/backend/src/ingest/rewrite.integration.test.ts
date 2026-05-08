import { describe, expect, it } from 'vitest';
import { rewrite } from './rewrite.js';
import type { Skill } from '../skills/parse.js';
import type { ChatEvent, ChatOpts, ProviderAdapter } from '@sanji/shared';

class ScriptedAdapter implements ProviderAdapter {
  public callCount = 0;
  constructor(private readonly responses: string[]) {}
  async *chat(_opts: ChatOpts): AsyncIterable<ChatEvent> {
    const r = this.responses[this.callCount] ?? '';
    this.callCount++;
    yield { type: 'text_delta', text: r };
    yield { type: 'message_stop', usage: { input: 0, output: 0 } };
  }
  async getAvailableModels() {
    return [];
  }
  async testCredentials() {
    return { ok: true as const };
  }
}

const ingestSkill: Skill = {
  name: 'ingest',
  trigger: '/ingest',
  description: 'test',
  body: 'test body',
  source: 'inline',
  tools: undefined,
  model: undefined,
};

const VALID_OUTPUT = `---
title: T
source: x
ingested_on: 2026-05-06
content_type: paper
summary: s
---

body
`;

describe('rewrite() integration', () => {
  it('returns parsed result on first-try valid output', async () => {
    const adapter = new ScriptedAdapter([VALID_OUTPUT]);
    const r = await rewrite(
      {
        extracted: { text: 'paper text', warnings: [] },
        filename: 'paper.pdf',
        format: 'pdf',
        context: { notes: [] },
      },
      { adapter, model: 'sonnet', ingestSkill },
    );
    expect(r.frontmatter.title).toBe('T');
    expect(adapter.callCount).toBe(1);
  });

  it('retries once on malformed output and succeeds on second try', async () => {
    const adapter = new ScriptedAdapter(['no delimiters', VALID_OUTPUT]);
    const r = await rewrite(
      {
        extracted: { text: 'x', warnings: [] },
        filename: 'x.pdf',
        format: 'pdf',
        context: { notes: [] },
      },
      { adapter, model: 'sonnet', ingestSkill },
    );
    expect(r.frontmatter.title).toBe('T');
    expect(adapter.callCount).toBe(2);
  });

  it('throws after second-try malformed output', async () => {
    const adapter = new ScriptedAdapter(['bad', 'still bad']);
    await expect(
      rewrite(
        {
          extracted: { text: 'x', warnings: [] },
          filename: 'x.pdf',
          format: 'pdf',
          context: { notes: [] },
        },
        { adapter, model: 'sonnet', ingestSkill },
      ),
    ).rejects.toThrow(/rewrite failed after retry/);
  });
});
