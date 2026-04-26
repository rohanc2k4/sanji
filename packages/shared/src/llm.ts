export type Role = 'user' | 'assistant' | 'system';

export interface ChatMessage {
  role: Role;
  content: string;
}

export interface ChatOpts {
  model: string;
  system?: string;
  messages: ChatMessage[];
  maxTokens?: number;
}

export type ChatEvent =
  | { type: 'text_delta'; text: string }
  | { type: 'message_stop'; usage?: { input: number; output: number } }
  | { type: 'error'; message: string };

export interface ModelInfo {
  id: string;
  displayName: string;
}

export interface ProviderAdapter {
  chat(opts: ChatOpts): AsyncIterable<ChatEvent>;
  getAvailableModels(): Promise<ModelInfo[]>;
  testCredentials(): Promise<{ ok: boolean; reason?: string }>;
}
