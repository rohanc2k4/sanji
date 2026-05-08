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

  it('terminates a streaming row when an error event arrives during rewriting (cancel-by-user contract)', () => {
    // App.tsx synthesizes a local error event when the user cancels an
    // in-flight ingest, because aborting the fetch closes the SSE reader
    // before the backend's "Cancelled by user" event reaches the client.
    // The synthesized event MUST flow through applyIngestEvent the same
    // way a backend error would, otherwise the row sits at 'rewriting'
    // forever with a spinner.
    let rows: StatusRow[] = [];
    rows = applyIngestEvent(rows, { kind: 'queued', fileId: 'a', sourceName: 'p.pdf' });
    rows = applyIngestEvent(rows, { kind: 'extracting', fileId: 'a', sourceName: 'p.pdf' });
    rows = applyIngestEvent(rows, { kind: 'rewriting', fileId: 'a', sourceName: 'p.pdf' });
    expect(rows[0]?.phase).toBe('rewriting');
    rows = applyIngestEvent(rows, {
      kind: 'error',
      fileId: 'a',
      sourceName: 'p.pdf',
      phase: 'rewrite',
      message: 'Cancelled by user.',
    });
    expect(rows[0]?.phase).toBe('error');
    expect(rows[0]?.errorMessage).toBe('Cancelled by user.');
  });

  it('stamps startedAt on the first working-phase event and preserves it through later phases', () => {
    let rows = applyIngestEvent([], { kind: 'queued', fileId: 'a', sourceName: 'p.pdf' });
    expect(rows[0]?.startedAt).toBeUndefined();
    rows = applyIngestEvent(rows, { kind: 'extracting', fileId: 'a', sourceName: 'p.pdf' });
    const stamped = rows[0]?.startedAt;
    expect(typeof stamped).toBe('number');
    rows = applyIngestEvent(rows, { kind: 'rewriting', fileId: 'a', sourceName: 'p.pdf' });
    expect(rows[0]?.startedAt).toBe(stamped);
    rows = applyIngestEvent(rows, { kind: 'writing', fileId: 'a', sourceName: 'p.pdf' });
    expect(rows[0]?.startedAt).toBe(stamped);
  });
});
