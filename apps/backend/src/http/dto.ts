import type { Config, ConfigDto } from '@sanji/shared';

export function configToDto(c: Config): ConfigDto {
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

export function dtoToConfig(dto: ConfigDto, current: Config): Config {
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
