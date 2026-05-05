import { Hono } from 'hono';
import { z } from 'zod';
import { loadOrInitConfig, saveConfig } from '../../config/loader.js';
import type { VaultPaths } from '../../config/paths.js';
import type { Config, ConfigDto } from '@sanji/shared';

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
  ui: z.object({
    theme: z.enum(['auto', 'light', 'dark']),
    mascot: z.enum(['chatty', 'quiet', 'off']),
  }).partial().optional(),
}).strict();

function configToDto(c: Config): ConfigDto {
  return {
    provider: {
      mode: c.provider.mode,
      ...(c.provider.anthropic_api.api_key
        ? { anthropicApiKey: c.provider.anthropic_api.api_key }
        : {}),
    },
    models: { default: c.models.default, heavy: c.models.heavy },
    calendar: {
      urls: c.calendar.urls,
      pollIntervalMinutes: c.calendar.poll_interval_minutes,
    },
    search: { tavilyApiKey: c.search.tavily_api_key },
    indexing: {
      chunkSizeTokens: c.indexing.chunk_size_tokens,
      chunkOverlapTokens: c.indexing.chunk_overlap_tokens,
      embeddingModel: c.indexing.embedding_model,
    },
    ui: { theme: c.ui.theme, mascot: c.ui.mascot },
  };
}

function mergeDto(current: ConfigDto, patch: z.infer<typeof PatchSchema>): ConfigDto {
  return {
    provider: { ...current.provider, ...patch.provider },
    models: { ...current.models, ...patch.models },
    calendar: { ...current.calendar, ...patch.calendar },
    search: { ...current.search, ...patch.search },
    indexing: { ...current.indexing, ...patch.indexing },
    ui: { ...current.ui, ...patch.ui },
  };
}

function dtoToConfig(dto: ConfigDto, current: Config): Config {
  return {
    provider: {
      mode: dto.provider.mode,
      claude_code: current.provider.claude_code,
      anthropic_api: { api_key: dto.provider.anthropicApiKey ?? '' },
    },
    models: { default: dto.models.default, heavy: dto.models.heavy },
    calendar: {
      urls: dto.calendar.urls,
      poll_interval_minutes: dto.calendar.pollIntervalMinutes,
    },
    search: { tavily_api_key: dto.search.tavilyApiKey },
    indexing: {
      chunk_size_tokens: dto.indexing.chunkSizeTokens,
      chunk_overlap_tokens: dto.indexing.chunkOverlapTokens,
      embedding_model: dto.indexing.embeddingModel,
    },
    ui: { theme: dto.ui.theme, mascot: dto.ui.mascot },
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
