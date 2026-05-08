import { parse as parseToml } from 'smol-toml';
import { z } from 'zod';

export const ConfigSchema = z
  .object({
    provider: z.object({
      mode: z.enum(['claude-code', 'anthropic-api']),
      claude_code: z.object({}).default({}).optional(),
      anthropic_api: z.object({ api_key: z.string().default('') }).default({ api_key: '' }),
    }),
    models: z
      .object({
        default: z.string().default('claude-sonnet-4-6'),
        heavy: z.string().default('claude-opus-4-7'),
      })
      .default({ default: 'claude-sonnet-4-6', heavy: 'claude-opus-4-7' }),
    calendar: z
      .object({
        urls: z
          .array(z.object({ label: z.string(), url: z.string().url() }))
          .default([]),
        poll_interval_minutes: z.number().int().positive().default(5),
      })
      .default({ urls: [], poll_interval_minutes: 5 }),
    search: z
      .object({ tavily_api_key: z.string().default('') })
      .default({ tavily_api_key: '' }),
    indexing: z
      .object({
        chunk_size_tokens: z.number().int().positive().default(500),
        chunk_overlap_tokens: z.number().int().nonnegative().default(50),
        embedding_model: z.string().default('Xenova/all-MiniLM-L6-v2'),
      })
      .default({
        chunk_size_tokens: 500,
        chunk_overlap_tokens: 50,
        embedding_model: 'Xenova/all-MiniLM-L6-v2',
      }),
    ingestion: z
      .object({
        // R1 Anthropic contextual retrieval. When true, every changed chunk
        // sends the full parent note body and the chunk text to the configured
        // LLM at index time. Improves retrieval at the cost of LLM tokens and
        // sending note bodies to the provider. Default off in v0.1; flip via
        // .sanji/config.toml. No UI surface for it in v0.1 (file-only).
        contextual_retrieval: z.boolean().default(false),
      })
      .default({ contextual_retrieval: false }),
    ui: z
      .object({
        theme: z.enum(['auto', 'light', 'dark']).default('auto'),
        mascot: z.enum(['chatty', 'quiet', 'off']).default('chatty'),
      })
      .default({ theme: 'auto', mascot: 'chatty' }),
    chat: z
      .object({
        autoClearThreshold: z.number().min(0).max(1),
        autoClearIdleMinutes: z.number().int().min(1),
      })
      .default({ autoClearThreshold: 0.75, autoClearIdleMinutes: 30 }),
  })
  .strict();

export type Config = z.infer<typeof ConfigSchema>;

export function parseConfig(toml: string): Config {
  const raw = parseToml(toml) as Record<string, unknown>;
  // Pre-process [chat] block: convert snake_case keys to camelCase, clamp
  // values into the schema's accepted range so power users who fat-finger a
  // value in the TOML get a sane default rather than a Zod throw.
  const rawChat = (raw.chat ?? {}) as Record<string, unknown>;
  const rawThreshold = typeof rawChat.auto_clear_threshold === 'number'
    ? rawChat.auto_clear_threshold
    : 0.75;
  const rawIdle = typeof rawChat.auto_clear_idle_minutes === 'number'
    ? rawChat.auto_clear_idle_minutes
    : 30;
  raw.chat = {
    autoClearThreshold: Math.max(0, Math.min(1, rawThreshold)),
    autoClearIdleMinutes: Math.max(1, Math.floor(rawIdle)),
  };
  return ConfigSchema.parse(raw);
}
