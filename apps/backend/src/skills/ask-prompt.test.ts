import { describe, expect, it } from 'vitest';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { resolveVaultPaths } from '../config/paths.js';
import { loadSkills } from './loader.js';
import type { Skill } from './parse.js';

async function loadAskSkill(): Promise<Skill> {
  const paths = resolveVaultPaths(mkdtempSync(join(tmpdir(), 'sanji-ask-prompt-')));
  const { skills, errors } = await loadSkills(paths);
  expect(errors).toEqual([]);
  const ask = skills.find((s) => s.trigger === '/ask');
  if (!ask) throw new Error('ask skill not found');
  return ask;
}

async function loadAskBody(): Promise<string> {
  const ask = await loadAskSkill();
  return ask.body;
}

describe('cite-or-decline rules in /ask system prompt', () => {
  it('instructs the agent to call hybrid_search before answering vault questions', async () => {
    const p = await loadAskBody();
    expect(p).toMatch(/hybrid_search/);
    expect(p.toLowerCase()).toMatch(/before answering|first/);
  });

  it('instructs the agent to quote a chunk verbatim before synthesizing', async () => {
    const p = await loadAskBody();
    expect(p.toLowerCase()).toMatch(/quote/);
  });

  it('instructs the agent to decline with the exact decline phrase when retrieval is empty or low-relevance', async () => {
    const p = await loadAskBody();
    expect(p).toContain(
      'I do not see this in your vault. Want me to search again with different phrasing, or were you asking about something not in your notes?',
    );
  });

  it('instructs the agent not to invent vault content', async () => {
    const p = await loadAskBody();
    expect(p.toLowerCase()).toMatch(/do not invent|not from the vault/);
  });

  it('instructs the agent to default to agentic search via grep_vault + read_note', async () => {
    const p = await loadAskBody();
    expect(p).toMatch(/grep_vault/);
    expect(p.toLowerCase()).toMatch(/default|primary|first/);
  });

  it('demotes hybrid_search to a fallback path', async () => {
    const p = await loadAskBody();
    expect(p).toMatch(/hybrid_search/);
    expect(p.toLowerCase()).toMatch(/fallback|fall back|>\s*5000|5000|too large|too big/);
  });

  it('places the conversation-memory rule above the soft-clarify rule', async () => {
    const p = await loadAskBody();
    const mem = p.toLowerCase().indexOf('previous turn');
    const memAlt = p.toLowerCase().indexOf('earlier turn');
    const memIdx = mem >= 0 ? mem : memAlt;
    const clarify = p.toLowerCase().indexOf('which one');
    expect(memIdx).toBeGreaterThan(-1);
    expect(clarify).toBeGreaterThan(-1);
    expect(memIdx).toBeLessThan(clarify);
  });

  it('keeps the exact decline phrasing for the empty-vault case', async () => {
    const p = await loadAskBody();
    expect(p).toContain('I do not see this in your vault');
  });

  it('lists list_vault and grep_vault in the tools frontmatter', async () => {
    const ask = await loadAskSkill();
    expect(ask.tools).toContain('list_vault');
    expect(ask.tools).toContain('grep_vault');
  });

  it('requires citations on every vault-content sentence, not just key facts', async () => {
    const p = await loadAskBody();
    // The strict-citation rule must be in effect; "every sentence" is the keyword.
    expect(p.toLowerCase()).toMatch(/every sentence.*citation|cite.*every sentence/);
  });

  it('instructs the agent to self-check before sending', async () => {
    const p = await loadAskBody();
    expect(p.toLowerCase()).toMatch(/self.check|before sending/);
  });
});
