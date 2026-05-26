import { describe, expect, it } from 'vitest';
import { MODEL_METADATA, getModelMetadata, modelsByProvider } from './model-metadata';

describe('model-metadata', () => {
  it('has all three Anthropic v0.1 models', () => {
    expect(MODEL_METADATA['claude-opus-4-7']).toBeDefined();
    expect(MODEL_METADATA['claude-sonnet-4-6']).toBeDefined();
    expect(MODEL_METADATA['claude-haiku-4-5-20251001']).toBeDefined();
  });

  it('returns the expected metadata for a known id', () => {
    const m = getModelMetadata('claude-opus-4-7');
    expect(m.displayName).toBe('Opus 4.7');
    expect(m.provider).toBe('anthropic');
    expect(m.contextWindow).toBe(200_000);
  });

  it('falls back gracefully on unknown ids', () => {
    const m = getModelMetadata('gemini-9.9-imaginary');
    expect(m.id).toBe('gemini-9.9-imaginary');
    expect(m.displayName).toBe('gemini-9.9-imaginary');
    expect(m.provider).toBe('anthropic');
    expect(m.contextWindow).toBe(200_000);
  });

  it('modelsByProvider filters correctly', () => {
    const anthropic = modelsByProvider('anthropic');
    expect(anthropic.length).toBeGreaterThanOrEqual(3);
    expect(anthropic.every((m) => m.provider === 'anthropic')).toBe(true);
    // No Gemini / OpenAI entries until v0.2.
    expect(modelsByProvider('gemini')).toEqual([]);
    expect(modelsByProvider('openai')).toEqual([]);
  });
});
