import { describe, expect, it } from 'vitest';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { resolveVaultPaths } from '../config/paths.js';
import { loadSkills } from './loader.js';

async function loadAskBody(): Promise<string> {
  const paths = resolveVaultPaths(mkdtempSync(join(tmpdir(), 'sanji-ask-prompt-')));
  const { skills, errors } = await loadSkills(paths);
  expect(errors).toEqual([]);
  const ask = skills.find((s) => s.trigger === '/ask');
  if (!ask) throw new Error('ask skill not found');
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
});
