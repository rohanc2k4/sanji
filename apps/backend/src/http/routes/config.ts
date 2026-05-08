import { Hono } from 'hono';
import { z } from 'zod';
import { loadOrInitConfig, saveConfig } from '../../config/loader.js';
import type { VaultPaths } from '../../config/paths.js';
import type { ConfigDto } from '@sanji/shared';
import { configToDto, dtoToConfig } from '../dto.js';

// PATCH accepts a partial DTO (camelCase wire shape).
const PatchSchema = z.object({
  provider: z.object({
    mode: z.enum(['claude-code', 'anthropic-api']),
    anthropicApiKey: z.string(),
  }).partial().optional(),
  models: z.object({ default: z.string(), heavy: z.string() }).partial().optional(),
  calendar: z.object({
    urls: z.array(z.object({ label: z.string(), url: z.string().url() })),
    pollIntervalMinutes: z.number().int().positive(),
  }).partial().optional(),
  search: z.object({ tavilyApiKey: z.string() }).partial().optional(),
  indexing: z.object({
    chunkSizeTokens: z.number().int().positive(),
    chunkOverlapTokens: z.number().int().nonnegative(),
    embeddingModel: z.string(),
  }).partial().optional(),
  ingestion: z.object({
    contextualRetrieval: z.boolean(),
  }).partial().optional(),
  ui: z.object({
    theme: z.enum(['auto', 'light', 'dark']),
    mascot: z.enum(['chatty', 'quiet', 'off']),
  }).partial().optional(),
  chat: z.object({
    autoClearThreshold: z.number().min(0).max(1),
    autoClearIdleMinutes: z.number().int().min(1),
  }).partial().optional(),
}).strict();

function mergeDto(current: ConfigDto, patch: z.infer<typeof PatchSchema>): ConfigDto {
  return {
    provider: { ...current.provider, ...patch.provider },
    models: { ...current.models, ...patch.models },
    calendar: { ...current.calendar, ...patch.calendar },
    search: { ...current.search, ...patch.search },
    indexing: { ...current.indexing, ...patch.indexing },
    ingestion: { ...current.ingestion, ...patch.ingestion },
    ui: { ...current.ui, ...patch.ui },
    chat: { ...current.chat, ...patch.chat },
  };
}

export function configRoute(deps: { paths: VaultPaths }) {
  const r = new Hono();
  r.get('/api/config', (c) => c.json(configToDto(loadOrInitConfig(deps.paths))));
  r.patch('/api/config', async (c) => {
    const raw = await c.req.json().catch(() => null);
    const parsed = PatchSchema.safeParse(raw);
    if (!parsed.success) {
      return c.json(
        { kind: 'api-error', code: 'BAD_PATCH', message: parsed.error.message },
        400,
      );
    }
    const currentInternal = loadOrInitConfig(deps.paths);
    const currentDto = configToDto(currentInternal);
    const mergedDto = mergeDto(currentDto, parsed.data);
    const mergedInternal = dtoToConfig(mergedDto, currentInternal);
    saveConfig(deps.paths, mergedInternal);
    return c.json(mergedDto);
  });
  return r;
}
