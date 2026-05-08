// Model metadata table. Single source of truth for context-window size,
// display name, and provider for every model the picker can pick. The
// chat header reads contextWindow from here to render the ContextBar's
// denominator; ModelPicker derives its options list from here too.
//
// v0.2 wires Gemini and OpenAI adapters. The 'gemini' / 'openai' provider
// values are reserved here today so the table shape doesn't churn when
// those land — adding a new provider is "append rows + plumb adapter +
// flip ModelPicker filter" rather than a schema change.

export type Provider = 'anthropic' | 'gemini' | 'openai';

export interface ModelMetadata {
  id: string;
  displayName: string;
  provider: Provider;
  /** Total context window in tokens (input + output combined budget). */
  contextWindow: number;
}

export const MODEL_METADATA: Record<string, ModelMetadata> = {
  'claude-opus-4-7': {
    id: 'claude-opus-4-7',
    displayName: 'Opus 4.7',
    provider: 'anthropic',
    contextWindow: 200_000,
  },
  'claude-sonnet-4-6': {
    id: 'claude-sonnet-4-6',
    displayName: 'Sonnet 4.6',
    provider: 'anthropic',
    contextWindow: 200_000,
  },
  'claude-haiku-4-5-20251001': {
    id: 'claude-haiku-4-5-20251001',
    displayName: 'Haiku 4.5',
    provider: 'anthropic',
    contextWindow: 200_000,
  },
  // v0.2 will append gemini-* and gpt-* entries here.
};

/**
 * Lookup with a safe fallback so an unknown model id (e.g. an old config
 * referencing a retired model) renders the bar at a reasonable
 * denominator instead of dividing by undefined. Provider defaults to
 * 'anthropic' since that's the only adapter wired in v0.1.
 */
export function getModelMetadata(id: string): ModelMetadata {
  return (
    MODEL_METADATA[id] ?? {
      id,
      displayName: id,
      provider: 'anthropic',
      contextWindow: 200_000,
    }
  );
}

/** Models filtered to a single provider, used by ModelPicker today. */
export function modelsByProvider(provider: Provider): ModelMetadata[] {
  return Object.values(MODEL_METADATA).filter((m) => m.provider === provider);
}
