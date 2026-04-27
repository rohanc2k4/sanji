import { describe, expect, it } from 'vitest';
import { ConfigSchema, parseConfig } from './config.js';

const FULL = `
[provider]
mode = "anthropic-api"

[provider.anthropic_api]
api_key = "sk-ant-test"

[models]
default = "claude-sonnet-4-6"
heavy = "claude-opus-4-7"

[calendar]
poll_interval_minutes = 5
urls = [{ label = "Personal", url = "https://example.com/cal.ics" }]

[search]
tavily_api_key = ""

[indexing]
chunk_size_tokens = 500
chunk_overlap_tokens = 50
embedding_model = "Xenova/all-MiniLM-L6-v2"

[ui]
theme = "auto"
mascot = "chatty"
`;

describe('ConfigSchema', () => {
  it('parses a fully populated config', () => {
    const cfg = parseConfig(FULL);
    expect(cfg.provider.mode).toBe('anthropic-api');
    expect(cfg.models.default).toBe('claude-sonnet-4-6');
    expect(cfg.calendar.urls).toHaveLength(1);
  });

  it('applies defaults when fields are missing', () => {
    const cfg = parseConfig(`[provider]\nmode = "claude-code"\n`);
    expect(cfg.models.default).toBe('claude-sonnet-4-6');
    expect(cfg.indexing.chunk_size_tokens).toBe(500);
    expect(cfg.ui.mascot).toBe('chatty');
    expect(cfg.calendar.urls).toEqual([]);
  });

  it('rejects an unknown provider mode', () => {
    expect(() =>
      parseConfig(`[provider]\nmode = "openai"\n`),
    ).toThrow(/provider/);
  });

  it('rejects negative chunk size', () => {
    expect(() =>
      parseConfig(`[provider]\nmode = "claude-code"\n[indexing]\nchunk_size_tokens = -1\n`),
    ).toThrow();
  });
});
