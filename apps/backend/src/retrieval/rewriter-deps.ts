import type { ProviderAdapter } from '@sanji/shared';
import type { RewriteDeps } from './rewriter.js';

const REWRITER_MODEL = 'claude-haiku-4-5-20251001';

/**
 * Wire a ProviderAdapter into the RewriteDeps['llm'] callable. Hardcodes
 * Haiku 4.5 with temperature 0.7 — paraphrases benefit from a touch of
 * variation, unlike contextual blurbs which want determinism.
 *
 * If the adapter does not implement `oneShot` (e.g. OfflineFakeAdapter),
 * this returns a no-op that yields '' so rewriteQuery returns [] and
 * hybrid_search degrades to single-query behavior.
 */
export function makeRewriterLlm(adapter: ProviderAdapter): RewriteDeps['llm'] {
  if (typeof adapter.oneShot !== 'function') {
    return async () => '';
  }
  const oneShot = adapter.oneShot.bind(adapter);
  return async ({ system, user }) =>
    oneShot({
      model: REWRITER_MODEL,
      system,
      segments: [{ text: user }],
      maxTokens: 256,
      temperature: 0.7,
    });
}
