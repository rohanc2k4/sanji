import { describe, expect, it } from 'vitest';
import { parseRewriteOutput, REQUIRED_FIELDS } from './rewrite.js';

// Minimal valid output: only `title` + `summary` are required. The thin-prompt
// skill body lets the model decide whether to include `content_type`, `tags`,
// or any other optional frontmatter field.
const MINIMAL = `---
title: Attention is all you need
summary: Introduces the Transformer.
---

Body paragraph here.

## Background

More content.
`;

const RICH = `---
title: Attention is all you need
summary: Introduces the Transformer.
content_type: paper
tags: [transformers, nlp]
---

Body.
`;

describe('parseRewriteOutput', () => {
  it('parses minimal valid frontmatter (title + summary only)', () => {
    const r = parseRewriteOutput(MINIMAL);
    expect(r.frontmatter.title).toBe('Attention is all you need');
    expect(r.frontmatter.summary).toBe('Introduces the Transformer.');
    expect(r.frontmatter.content_type).toBeUndefined();
    expect(r.frontmatter.tags).toBeUndefined();
    expect(r.body).toContain('Body paragraph here.');
  });

  it('parses optional content_type and tags when present', () => {
    const r = parseRewriteOutput(RICH);
    expect(r.frontmatter.content_type).toBe('paper');
    expect(r.frontmatter.tags).toEqual(['transformers', 'nlp']);
  });

  it('throws on missing delimiters', () => {
    expect(() => parseRewriteOutput('no delimiters here')).toThrow(/frontmatter/i);
  });

  it('throws when required title is missing, naming the field', () => {
    const missing = `---
summary: x
---

body
`;
    expect(() => parseRewriteOutput(missing)).toThrow(/title/);
  });

  it('throws when required summary is missing, naming the field', () => {
    const missing = `---
title: x
---

body
`;
    expect(() => parseRewriteOutput(missing)).toThrow(/summary/);
  });

  it('REQUIRED_FIELDS lists exactly title and summary', () => {
    expect(REQUIRED_FIELDS).toEqual(['title', 'summary']);
  });

  it('strips a leading prose preamble before the first --- delimiter', () => {
    const wrapped = `Here is the structured note for the source:\n\n${MINIMAL}`;
    const r = parseRewriteOutput(wrapped);
    expect(r.frontmatter.title).toBe('Attention is all you need');
    expect(r.body).toContain('Body paragraph here.');
  });

  it('strips a markdown code fence wrapping the entire output', () => {
    const wrapped = '```markdown\n' + MINIMAL.trimEnd() + '\n```';
    const r = parseRewriteOutput(wrapped);
    expect(r.frontmatter.title).toBe('Attention is all you need');
  });

  it('strips a bare ``` code fence wrapping the entire output', () => {
    const wrapped = '```\n' + MINIMAL.trimEnd() + '\n```';
    const r = parseRewriteOutput(wrapped);
    expect(r.frontmatter.title).toBe('Attention is all you need');
  });

  it('strips both a code fence and leading prose', () => {
    const wrapped =
      'Here you go:\n\n```markdown\n' + MINIMAL.trimEnd() + '\n```';
    const r = parseRewriteOutput(wrapped);
    expect(r.frontmatter.title).toBe('Attention is all you need');
  });
});
