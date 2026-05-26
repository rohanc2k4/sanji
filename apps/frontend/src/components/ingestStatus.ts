import type { IngestEvent } from '@sanji/shared';

export type StatusPhase =
  | 'queued'
  | 'extracting'
  | 'rewriting'
  | 'writing'
  | 'done'
  | 'skipped'
  | 'error';

export interface StatusRow {
  fileId: string;
  sourceName: string;
  phase: StatusPhase;
  startedAt?: number;
  outputPath?: string;
  existingPath?: string;
  errorMessage?: string;
  tokensInput?: number;
  tokensOutput?: number;
}

export function applyIngestEvent(rows: StatusRow[], ev: IngestEvent): StatusRow[] {
  const idx = rows.findIndex((r) => r.fileId === ev.fileId);
  switch (ev.kind) {
    case 'queued':
      if (idx >= 0) return rows;
      return [...rows, { fileId: ev.fileId, sourceName: ev.sourceName, phase: 'queued' }];
    case 'extracting':
    case 'rewriting':
    case 'writing':
      if (idx < 0) return rows;
      return rows.map((r, i) =>
        i === idx
          ? { ...r, phase: ev.kind, startedAt: r.startedAt ?? Date.now() }
          : r,
      );
    case 'done':
      if (idx < 0) return rows;
      return rows.map((r, i) =>
        i === idx
          ? {
              ...r,
              phase: 'done',
              outputPath: ev.outputPath,
              tokensInput: ev.tokensInput,
              tokensOutput: ev.tokensOutput,
            }
          : r,
      );
    case 'skipped':
      if (idx < 0) return rows;
      return rows.map((r, i) =>
        i === idx ? { ...r, phase: 'skipped', existingPath: ev.existingPath } : r,
      );
    case 'error':
      if (idx < 0) return rows;
      return rows.map((r, i) =>
        i === idx ? { ...r, phase: 'error', errorMessage: ev.message } : r,
      );
  }
}
