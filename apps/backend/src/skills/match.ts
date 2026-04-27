import type { Skill } from './parse.js';

export interface SkillMatch {
  skill: Skill;
  args: string;
}

const SLASH_RE = /^\/([A-Za-z0-9_-]+)(?:\s+([\s\S]*))?$/;

export function matchSkill(skills: readonly Skill[], message: string): SkillMatch | null {
  const m = message.match(SLASH_RE);
  if (m) {
    const trigger = `/${m[1]}`;
    const exact = skills.find((s) => s.trigger === trigger);
    if (exact) return { skill: exact, args: (m[2] ?? '').trim() };
    // Unknown slash → fall through to default
  }

  const ask = skills.find((s) => s.trigger === '/ask');
  if (!ask) return null;
  return { skill: ask, args: message.trim() };
}
