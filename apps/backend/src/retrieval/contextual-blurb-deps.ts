import type { ProviderAdapter } from '@sanji/shared';
import type { BlurbDeps, BlurbLlmCall } from './contextual-blurb.js';

const BLURB_MODEL = 'claude-haiku-4-5-20251001';

/**
 * Wire a ProviderAdapter into the BlurbDeps['llm'] callable. Hardcodes Haiku
 * 4.5 regardless of the user's chat model, since blurbs are a utility call
 * (cheap, fast, parallelized at ingest time).
 *
 * If the adapter does not implement `oneShot` (e.g. OfflineFakeAdapter), this
 * returns a no-op that yields '' — indexing still works, chunks persist with
 * context_text = null.
 */
export function makeBlurbLlm(adapter: ProviderAdapter): BlurbDeps['llm'] {
  if (typeof adapter.oneShot !== 'function') {
    return async () => '';
  }
  const oneShot = adapter.oneShot.bind(adapter);
  return async (call: BlurbLlmCall): Promise<string> => {
    return oneShot({
      model: BLURB_MODEL,
      system: call.system,
      segments: [
        { text: `<document>\n${call.docBody}\n</document>`, cache: call.cacheParent },
        { text: `<chunk>\n${call.chunk}\n</chunk>` },
      ],
      maxTokens: 256,
    });
  };
}
