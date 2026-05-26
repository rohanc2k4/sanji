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
      /**
       * Latest tool_call_start summary, e.g. "Searching for 'logistic
       * regression'". Cleared on the matching tool_call_end so the activity
       * line doesn't keep stale text after a tool finishes; the next
       * tool_call_start replaces it. Undefined when no tool is in flight.
       */
      currentActivity?: string;
    }
  | {
      /**
       * A divider injected when the auto-clear heuristic (idle / threshold)
       * fires or the user runs /clear. Renders as a visual break in later
       * tasks; `turnsToHistory` skips these so they never travel to the LLM.
       */
      role: 'session_break';
      trigger: 'idle' | 'threshold' | 'manual';
      message: string | null;
      timestamp: Date;
    };

export function makeAssistantTurn(): Turn {
  return { role: 'assistant', deltas: [], toolCalls: [], errors: [] };
}

/**
 * Ensure the last turn is an assistant turn so the index-based mutation
 * branches below have somewhere to write. If the trailing turn is a
 * `session_break` (auto-clear divider), append a fresh assistant turn so
 * the next stream of deltas/tool calls collects on a clean turn after the
 * divider rather than silently dropping. The user-only case stays
 * unchanged: an event arriving with no assistant turn yet is a bug
 * upstream, so we preserve the existing "return turns" semantics there.
 */
function ensureAssistantLast(turns: Turn[]): Turn[] {
  const last = turns[turns.length - 1];
  if (last?.role === 'session_break') return [...turns, makeAssistantTurn()];
  return turns;
}

export function applyEvent(turns: Turn[], event: ChatEvent): Turn[] {
  const prepared = ensureAssistantLast(turns);
  const lastIdx = prepared.length - 1;
  const last = prepared[lastIdx];
  if (!last || last.role !== 'assistant') return turns;
  turns = prepared;

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
    case 'tool_call_start': {
      const next = { ...last, currentActivity: event.args_summary };
      return [...turns.slice(0, lastIdx), next];
    }
    case 'tool_call_end': {
      // Drop the activity label when the tool finishes; if the model fires
      // another tool right after, its tool_call_start re-populates the
      // field. The frontend renders "Writing answer …" as soon as text
      // deltas start flowing, so a brief gap with no activity reads fine.
      const next = { ...last, currentActivity: undefined };
      return [...turns.slice(0, lastIdx), next];
    }
    case 'tool_use_start':
    case 'tool_use_input_delta':
    case 'message_stop':
    case 'usage_update':
      // usage_update is consumed by useChat's usage state, not the per-turn
      // assistant Turn shape — applyEvent is a no-op here on purpose.
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
