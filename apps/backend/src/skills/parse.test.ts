import { describe, expect, it } from 'vitest';
import { parseSkill } from './parse.js';

const FULL = `---
name: ask
description: Default Q&A skill
trigger: /ask
model: claude-sonnet-4-6
tools:
  - search_vault
  - semantic_search
  - read_note
---

You are Sanji's /ask skill.

Use the vault tools to answer the user's question.
`;

describe('parseSkill', () => {
  it('parses frontmatter and body', () => {
    const skill = parseSkill('ask.md', FULL);
    expect(skill.name).toBe('ask');
    expect(skill.trigger).toBe('/ask');
    expect(skill.model).toBe('claude-sonnet-4-6');
    expect(skill.tools).toEqual(['search_vault', 'semantic_search', 'read_note']);
    expect(skill.body.trim().startsWith("You are Sanji's /ask skill.")).toBe(true);
  });

  it('treats missing tools as undefined', () => {
    const src = `---\nname: open\ntrigger: /open\n---\n\nbody`;
    const skill = parseSkill('open.md', src);
    expect(skill.tools).toBeUndefined();
  });

  it('treats missing model as undefined', () => {
    const src = `---\nname: open\ntrigger: /open\n---\n\nbody`;
    const skill = parseSkill('open.md', src);
    expect(skill.model).toBeUndefined();
  });

  it('throws on missing required frontmatter (name or trigger)', () => {
    expect(() => parseSkill('bad.md', `---\ntrigger: /x\n---\nbody`)).toThrow(/name/);
    expect(() => parseSkill('bad.md', `---\nname: x\n---\nbody`)).toThrow(/trigger/);
  });

  it('rejects a trigger that does not start with /', () => {
    expect(() => parseSkill('bad.md', `---\nname: x\ntrigger: x\n---\nbody`)).toThrow(/trigger/);
  });
});
