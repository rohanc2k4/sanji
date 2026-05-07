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
}

export type ChatEvent =
  | { type: 'text_delta'; text: string }
  | { type: 'tool_use_start'; id: string; name: string }
  | { type: 'tool_use_input_delta'; id: string; json: string }
  | { type: 'tool_use_complete'; id: string; name: string; input: Record<string, unknown> }
  | { type: 'tool_result'; id: string; content: string; isError?: boolean }
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
