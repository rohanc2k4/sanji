import { describe, expect, it } from 'vitest';
import type {
  ContentType,
  FileFormat,
  IngestEvent,
  NoteFrontmatter,
} from './ingest.js';

describe('ingest types', () => {
  it('NoteFrontmatter has the expected required + optional fields', () => {
    const fm: NoteFrontmatter = {
      title: 'Attention is all you need',
      source: '.sanji/originals/attention.pdf',
      ingested_on: '2026-05-06',
      content_type: 'paper',
      summary: 'Introduces the Transformer architecture.',
      tags: ['transformers', 'nlp'],
      original_format: 'pdf',
      pages: 12,
    };
    const ct: ContentType | undefined = fm.content_type;
    expect(ct).toBe('paper');
    expect(fm.original_format).toBe('pdf');
  });

  it('NoteFrontmatter accepts the wildcard "other" content type', () => {
    const fm: NoteFrontmatter = {
      title: 'Misc note',
      source: 'paste',
      ingested_on: '2026-05-06',
      content_type: 'other',
      summary: 'Did not fit any branch.',
    };
    expect(fm.content_type).toBe('other');
  });

  it('NoteFrontmatter accepts a minimal shape with content_type omitted', () => {
    const fm: NoteFrontmatter = {
      title: 'Loose note',
      source: 'paste',
      ingested_on: '2026-05-06',
      summary: 'No bucket assigned by the model.',
    };
    expect(fm.content_type).toBeUndefined();
  });

  it('IngestEvent variants discriminate on kind', () => {
    const events: IngestEvent[] = [
      { kind: 'queued', fileId: 'abc', sourceName: 'paper.pdf' },
      { kind: 'extracting', fileId: 'abc', sourceName: 'paper.pdf' },
      { kind: 'rewriting', fileId: 'abc', sourceName: 'paper.pdf' },
      { kind: 'writing', fileId: 'abc', sourceName: 'paper.pdf' },
      { kind: 'done', fileId: 'abc', sourceName: 'paper.pdf', outputPath: 'inbox/paper.md', tokensInput: 8000, tokensOutput: 1200 },
      { kind: 'skipped', fileId: 'abc', sourceName: 'paper.pdf', existingPath: 'inbox/paper.md' },
      { kind: 'error', fileId: 'abc', sourceName: 'paper.pdf', phase: 'extract', message: 'PDF is password-protected.' },
    ];
    expect(events.length).toBe(7);
    expect(events.every((e) => 'kind' in e)).toBe(true);
  });
});
