import { describe, expect, it } from 'vitest';
import { matchSkill } from './match.js';
import type { Skill } from './parse.js';

const ask: Skill = {
  source: 'b/ask.md', name: 'ask', description: '', trigger: '/ask', body: 'ask body',
};
const recap: Skill = {
  source: 'b/recap.md', name: 'recap', description: '', trigger: '/recap', body: 'recap body',
};

describe('matchSkill', () => {
  it('routes a slash-prefixed message to the matching skill', () => {
    const r = matchSkill([ask, recap], '/recap last week');
    expect(r?.skill.trigger).toBe('/recap');
    expect(r?.args).toBe('last week');
  });

  it('routes plain text to /ask by default', () => {
    const r = matchSkill([ask, recap], 'what did I decide about intuit');
    expect(r?.skill.trigger).toBe('/ask');
    expect(r?.args).toBe('what did I decide about intuit');
  });

  it('passes the full message through when /ask is the explicit trigger', () => {
    const r = matchSkill([ask, recap], '/ask what is FTS5');
    expect(r?.skill.trigger).toBe('/ask');
    expect(r?.args).toBe('what is FTS5');
  });

  it('returns null when an unknown slash trigger is used and /ask is not loaded', () => {
    const r = matchSkill([recap], '/research deep dive');
    expect(r).toBeNull();
  });

  it('falls back to /ask for an unknown slash trigger when /ask is loaded', () => {
    const r = matchSkill([ask, recap], '/unknown thing');
    expect(r?.skill.trigger).toBe('/ask');
    expect(r?.args).toBe('/unknown thing');
  });
});
