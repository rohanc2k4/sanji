import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { stringify as tomlStringify } from 'smol-toml';
import { type Config, parseConfig } from '@sanji/shared';
import type { VaultPaths } from './paths.js';

const DEFAULT_TOML = `# Sanji configuration. See docs/dev-setup.md.
[provider]
mode = "claude-code"

[provider.anthropic_api]
api_key = ""

[models]
default = "claude-sonnet-4-6"
heavy = "claude-opus-4-7"

[calendar]
urls = []
poll_interval_minutes = 5

[search]
tavily_api_key = ""

[indexing]
chunk_size_tokens = 500
chunk_overlap_tokens = 50
embedding_model = "Xenova/all-MiniLM-L6-v2"

[ingestion]
# R1 Anthropic contextual retrieval. When true, every changed chunk sends the
# full parent note body and the chunk text to the configured LLM at index
# time. Improves retrieval (~25-35% recall lift in Anthropic's results) at
# the cost of LLM tokens per chunk and sending note bodies to the provider.
# Default off in v0.1.
contextual_retrieval = false

[ui]
theme = "auto"
mascot = "chatty"

[chat]
# Auto-clear thresholds for the in-app chat. When context window usage crosses
# auto_clear_threshold (fraction in [0,1]) AND the conversation has been idle
# for auto_clear_idle_minutes, Sanji offers to clear history. Tune both knobs
# for power users who want stricter or looser auto-clear behavior.
auto_clear_threshold = 0.75
auto_clear_idle_minutes = 30
`;

export function loadOrInitConfig(paths: VaultPaths): Config {
  if (!existsSync(paths.sanjiDir)) mkdirSync(paths.sanjiDir, { recursive: true });
  if (!existsSync(paths.configFile)) writeFileSync(paths.configFile, DEFAULT_TOML, 'utf8');
  const toml = readFileSync(paths.configFile, 'utf8');
  return parseConfig(toml);
}

export function saveConfig(paths: VaultPaths, cfg: Config): void {
  if (!existsSync(paths.sanjiDir)) mkdirSync(paths.sanjiDir, { recursive: true });
  // smol-toml does not serialize `undefined`. Strip optional empties before stringify.
  const serializable: Record<string, unknown> = {
    provider: {
      mode: cfg.provider.mode,
      ...(cfg.provider.claude_code ? { claude_code: cfg.provider.claude_code } : {}),
      anthropic_api: cfg.provider.anthropic_api,
    },
    models: cfg.models,
    calendar: cfg.calendar,
    search: cfg.search,
    indexing: cfg.indexing,
    ingestion: cfg.ingestion,
    ui: cfg.ui,
    chat: {
      auto_clear_threshold: cfg.chat.autoClearThreshold,
      auto_clear_idle_minutes: cfg.chat.autoClearIdleMinutes,
    },
  };
  writeFileSync(paths.configFile, tomlStringify(serializable), 'utf8');
}
