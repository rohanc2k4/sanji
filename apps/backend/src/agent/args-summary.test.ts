import { describe, expect, it } from 'vitest';
import { argsSummary } from './args-summary.js';

describe('argsSummary', () => {
  it('formats grep_vault with pattern only', () => {
    expect(argsSummary('grep_vault', { pattern: 'logistic regression' })).toBe(
      'Searching for "logistic regression"',
    );
  });

  it('formats grep_vault with folder + pattern', () => {
    expect(
      argsSummary('grep_vault', { pattern: 'lr_sgd|sgd|gradient descent', folder: 'cmsc416' }),
    ).toBe('Searching cmsc416 for "lr_sgd|sgd|gradient descent"');
  });

  it('formats read_note', () => {
    expect(argsSummary('read_note', { path: 'inbox/lr_sgd.md' })).toBe('Reading inbox/lr_sgd.md');
  });

  it('formats list_vault with and without folder', () => {
    expect(argsSummary('list_vault', { folder: 'cmsc416' })).toBe('Listing cmsc416/');
    expect(argsSummary('list_vault', {})).toBe('Listing vault root');
  });

  it('formats hybrid_search as fallback wording', () => {
    expect(argsSummary('hybrid_search', { query: 'X' })).toBe(
      'Falling back to hybrid search for "X"',
    );
  });

  it('formats write_note', () => {
    expect(argsSummary('write_note', { path: 'a.md', content: 'body' })).toBe(
      'Writing note to a.md',
    );
  });

  it('formats legacy semantic / search_vault tools', () => {
    expect(argsSummary('semantic_search', { query: 'Y' })).toBe('Legacy search for "Y"');
    expect(argsSummary('search_vault', { query: 'Z' })).toBe('Legacy search for "Z"');
  });

  it('falls back to a generic label for unknown tools', () => {
    expect(argsSummary('mystery', { foo: 'bar' })).toBe('Running mystery');
  });

  it('truncates pathologically long values', () => {
    const long = 'x'.repeat(500);
    const out = argsSummary('grep_vault', { pattern: long });
    expect(out.length).toBeLessThanOrEqual(80);
    expect(out.endsWith('…')).toBe(true);
  });
});
