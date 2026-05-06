import { describe, expect, it } from 'vitest';
import { applyIngestEvent, type StatusRow } from './ingestStatus';
import type { IngestEvent } from '@sanji/shared';

describe('applyIngestEvent', () => {
  it('inserts a new row on queued', () => {
    const next = applyIngestEvent([], { kind: 'queued', fileId: 'a', sourceName: 'paper.pdf' });
    expect(next).toEqual<StatusRow[]>([
      { fileId: 'a', sourceName: 'paper.pdf', phase: 'queued' },
    ]);
  });

  it('advances phase via extracting → rewriting → writing → done and captures usage', () => {
    let rows: StatusRow[] = [];
    const events: IngestEvent[] = [
      { kind: 'queued', fileId: 'a', sourceName: 'p.pdf' },
      { kind: 'extracting', fileId: 'a', sourceName: 'p.pdf' },
      { kind: 'rewriting', fileId: 'a', sourceName: 'p.pdf' },
      { kind: 'writing', fileId: 'a', sourceName: 'p.pdf' },
      {
        kind: 'done',
        fileId: 'a',
        sourceName: 'p.pdf',
        outputPath: 'inbox/p.md',
        tokensInput: 100,
        tokensOutput: 50,
      },
    ];
    for (const ev of events) rows = applyIngestEvent(rows, ev);
    expect(rows[0]?.phase).toBe('done');
    expect(rows[0]?.outputPath).toBe('inbox/p.md');
    expect(rows[0]?.tokensInput).toBe(100);
    expect(rows[0]?.tokensOutput).toBe(50);
  });

  it('marks rows as skipped with the existing path', () => {
    let rows: StatusRow[] = [{ fileId: 'a', sourceName: 'p.pdf', phase: 'queued' }];
    rows = applyIngestEvent(rows, {
      kind: 'skipped',
      fileId: 'a',
      sourceName: 'p.pdf',
      existingPath: 'inbox/p.md',
    });
    expect(rows[0]?.phase).toBe('skipped');
    expect(rows[0]?.existingPath).toBe('inbox/p.md');
  });

  it('marks rows as error with the message', () => {
    let rows: StatusRow[] = [{ fileId: 'b', sourceName: 'q.pdf', phase: 'extracting' }];
    rows = applyIngestEvent(rows, {
      kind: 'error',
      fileId: 'b',
      sourceName: 'q.pdf',
      phase: 'extract',
      message: 'Could not parse PDF.',
    });
    expect(rows[0]?.phase).toBe('error');
    expect(rows[0]?.errorMessage).toBe('Could not parse PDF.');
  });

  it('ignores events for unknown fileIds (no row created from extracting)', () => {
    const rows = applyIngestEvent([], {
      kind: 'extracting',
      fileId: 'unknown',
      sourceName: 'x.pdf',
    });
    expect(rows).toEqual([]);
  });

  it('ignores duplicate queued events for the same fileId', () => {
    let rows = applyIngestEvent([], { kind: 'queued', fileId: 'a', sourceName: 'p.pdf' });
    rows = applyIngestEvent(rows, { kind: 'queued', fileId: 'a', sourceName: 'p.pdf' });
    expect(rows).toHaveLength(1);
  });
});
