import type { ChatEvent } from '@sanji/shared';

export interface AssistantToolCall {
  id: string;
  name: string;
  input: unknown;
  result?: string;
}

export type Turn =
  | { role: 'user'; content: string }
  | {
      role: 'assistant';
      deltas: string[];
      toolCalls: AssistantToolCall[];
      errors: string[];
    };

export function makeAssistantTurn(): Turn {
  return { role: 'assistant', deltas: [], toolCalls: [], errors: [] };
}

export function applyEvent(turns: Turn[], event: ChatEvent): Turn[] {
  const lastIdx = turns.length - 1;
  const last = turns[lastIdx];
  if (!last || last.role !== 'assistant') return turns;

  switch (event.type) {
    case 'text_delta': {
      const next = { ...last, deltas: [...last.deltas, event.text] };
      return [...turns.slice(0, lastIdx), next];
    }
    case 'tool_use_complete': {
      const next = {
        ...last,
        toolCalls: [
          ...last.toolCalls,
          { id: event.id, name: event.name, input: event.input },
        ],
      };
      return [...turns.slice(0, lastIdx), next];
    }
    case 'tool_result': {
      const next = {
        ...last,
        toolCalls: last.toolCalls.map((tc) =>
          tc.id === event.id ? { ...tc, result: event.content } : tc,
        ),
      };
      return [...turns.slice(0, lastIdx), next];
    }
    case 'error': {
      const next = { ...last, errors: [...last.errors, event.message] };
      return [...turns.slice(0, lastIdx), next];
    }
    case 'tool_use_start':
    case 'tool_use_input_delta':
    case 'message_stop':
      return turns;
    default: {
      // Exhaustiveness check: a new ChatEvent variant in @sanji/shared will
      // make this line a compile-time error, forcing an explicit handling
      // decision rather than a silent runtime fall-through.
      const _exhaustive: never = event;
      void _exhaustive;
      return turns;
    }
  }
}
