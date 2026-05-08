export type Role = 'user' | 'assistant' | 'system';

export interface ChatMessage {
  role: Role;
  content: string;
}

export interface ChatTool {
  name: string;
  description: string;
  input_schema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
    additionalProperties?: boolean;
  };
}

export interface ChatOpts {
  model: string;
  system?: string;
  messages: ChatMessage[];
  maxTokens?: number;
  tools?: ChatTool[];
  /**
   * Called by adapters when the model invokes a tool. Returns the tool's string output.
   * The adapter is responsible for surfacing the matching tool_use_* ChatEvents.
   */
  toolHandler?: (name: string, input: Record<string, unknown>) => Promise<string>;
  /**
   * Optional abort signal. Adapters that pass it through to the underlying
   * SDK call cause the streaming HTTP request to terminate when fired, so
   * callers (e.g. ingest cancel) can interrupt an in-flight rewrite mid-token
   * instead of waiting for the SDK to finish before runSkill's next abort
   * check fires. Adapters that ignore the signal degrade to per-event abort
   * checking, which is still correct but slower to surface cancellation.
   */
  signal?: AbortSignal;
}

export type ChatEvent =
  | { type: 'text_delta'; text: string }
  | { type: 'tool_use_start'; id: string; name: string }
  | { type: 'tool_use_input_delta'; id: string; json: string }
  | { type: 'tool_use_complete'; id: string; name: string; input: Record<string, unknown> }
  | { type: 'tool_result'; id: string; content: string; isError?: boolean }
  /**
   * High-level activity events derived from tool_use_complete / tool_result.
   * Distinct from tool_use_* (which mirror the provider's wire protocol):
   * these carry a human-readable args_summary so the chat UI can show "what
   * the agent is doing right now" without each frontend re-implementing the
   * argsSummary mapping. Emitted by runAgent, not by the provider adapter.
   */
  | { type: 'tool_call_start'; id: string; tool: string; args_summary: string }
  | { type: 'tool_call_end'; id: string; tool: string }
  /**
   * Token-usage update for the just-completed LLM turn. Emitted by runAgent
   * after each adapter chat() call resolves, derived from the adapter's
   * message_stop usage payload. Frontend accumulates input + output tokens
   * across turns and renders them against the active model's contextWindow
   * (see apps/frontend/src/chat/model-metadata.ts).
   *
   * `cache_read_input_tokens` / `cache_creation_input_tokens` are reserved
   * for the v0.2 caching pipeline; adapters that don't surface them omit
   * the fields, frontend ignores them today. Adapters that report no
   * usage at all (e.g. the Claude Code SDK in some modes) emit
   * input_tokens=0, output_tokens=0; the frontend treats zeroes as
   * unknown rather than erroring.
   */
  | {
      type: 'usage_update';
      input_tokens: number;
      output_tokens: number;
      cache_read_input_tokens?: number;
      cache_creation_input_tokens?: number;
    }
  | { type: 'message_stop'; usage?: { input: number; output: number } }
  | { type: 'error'; message: string };

export interface ModelInfo {
  id: string;
  displayName: string;
}

/**
 * A single cached text segment passed to a one-shot request. When `cache` is
 * true the adapter renders this as a content block with
 * `cache_control: { type: 'ephemeral' }` (Anthropic API only — the Claude
 * Code SDK does not currently expose cache_control, so the flag is ignored
 * there).
 */
export interface OneShotSegment {
  text: string;
  cache?: boolean;
}

export interface OneShotOpts {
  model: string;
  system?: string;
  /**
   * Ordered cached/uncached text segments rendered as the user message.
   * The adapter concatenates them into the request; cached segments are
   * emitted as separate text blocks with cache_control where supported.
   */
  segments: OneShotSegment[];
  maxTokens?: number;
  /**
   * Sampling temperature. Defaults to 0 (deterministic) when omitted, which
   * is what utility calls like contextual blurbs want. The multi-query
   * rewriter passes ~0.7 to encourage paraphrase variation.
   */
  temperature?: number;
}

export interface ProviderAdapter {
  chat(opts: ChatOpts): AsyncIterable<ChatEvent>;
  getAvailableModels(): Promise<ModelInfo[]>;
  testCredentials(): Promise<{ ok: boolean; reason?: string }>;
  /**
   * Non-streaming single-turn call. Returns the assistant's first text block.
   * Used for utility calls (e.g. context-blurb generation) where streaming
   * has no value. Optional so that fake/offline adapters can opt out.
   */
  oneShot?(opts: OneShotOpts): Promise<string>;
}
