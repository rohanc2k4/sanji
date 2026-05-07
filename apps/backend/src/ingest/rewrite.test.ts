import { describe, expect, it } from 'vitest';
import { parseRewriteOutput, REQUIRED_FIELDS } from './rewrite.js';

const VALID = `---
title: Attention is all you need
source: .sanji/originals/attention.pdf
ingested_on: 2026-05-06
content_type: paper
summary: Introduces the Transformer.
tags: [transformers, nlp]
---

Body paragraph here.

## Background

More content.
`;

describe('parseRewriteOutput', () => {
  it('parses valid YAML frontmatter + body', () => {
    const r = parseRewriteOutput(VALID);
    expect(r.frontmatter.title).toBe('Attention is all you need');
    expect(r.frontmatter.content_type).toBe('paper');
    expect(r.body).toContain('Body paragraph here.');
  });

  it('throws on missing delimiters', () => {
    expect(() => parseRewriteOutput('no delimiters here')).toThrow(/frontmatter/i);
  });

  it('throws on missing required field with the field listed', () => {
    const missing = `---
title: x
source: y
ingested_on: 2026-05-06
content_type: paper
---

body
`;
    expect(() => parseRewriteOutput(missing)).toThrow(/summary/);
  });

  it('lists every required field', () => {
    expect(REQUIRED_FIELDS).toEqual([
      'title',
      'source',
      'ingested_on',
      'content_type',
      'summary',
    ]);
  });

  it('strips a leading prose preamble before the first --- delimiter', () => {
    const wrapped = `Here is the structured note for the source:\n\n${VALID}`;
    const r = parseRewriteOutput(wrapped);
    expect(r.frontmatter.title).toBe('Attention is all you need');
    expect(r.body).toContain('Body paragraph here.');
  });

  it('strips a markdown code fence wrapping the entire output', () => {
    const wrapped = '```markdown\n' + VALID.trimEnd() + '\n```';
    const r = parseRewriteOutput(wrapped);
    expect(r.frontmatter.content_type).toBe('paper');
  });

  it('strips a bare ``` code fence wrapping the entire output', () => {
    const wrapped = '```\n' + VALID.trimEnd() + '\n```';
    const r = parseRewriteOutput(wrapped);
    expect(r.frontmatter.content_type).toBe('paper');
  });

  it('strips both a code fence and leading prose', () => {
    const wrapped =
      'Here you go:\n\n```markdown\n' + VALID.trimEnd() + '\n```';
    const r = parseRewriteOutput(wrapped);
    expect(r.frontmatter.title).toBe('Attention is all you need');
  });
});
