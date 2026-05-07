import { describe, expect, it } from 'vitest';
import { MODEL_OPTIONS } from './ModelPicker.js';

// Existing frontend tests are pure-data / pure-logic vitest tests
// (see applyEvent.test.ts, ingestStatus.test.ts, reducer.test.ts) — there
// is no @testing-library/react in this repo, and the task brief said not
// to add one just for this picker. So these tests cover the data contract
// (the three model rungs the chat header exposes) and trust the JSX wiring
// is exercised by the Playwright E2E that flows through the chat.

describe('MODEL_OPTIONS', () => {
  it('exposes Opus 4.7, Sonnet 4.6, Haiku 4.5 in that order', () => {
    expect(MODEL_OPTIONS.map((m) => m.id)).toEqual([
      'claude-opus-4-7',
      'claude-sonnet-4-6',
      'claude-haiku-4-5-20251001',
    ]);
  });

  it('every option has a non-empty label', () => {
    for (const opt of MODEL_OPTIONS) {
      expect(opt.label).toMatch(/\S/);
    }
  });

  it('ids are unique', () => {
    const ids = MODEL_OPTIONS.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
