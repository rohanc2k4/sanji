import type { ChatEvent, ChatMessage, ProviderAdapter } from '@sanji/shared';
import { matchSkill } from '../skills/match.js';
import type { Skill } from '../skills/parse.js';
import type { Registry } from '../tools/registry.js';
import type { ToolContext } from '../tools/types.js';
import { argsSummary } from './args-summary.js';

export interface AgentDependencies {
  adapter: ProviderAdapter;
  registry: Registry;
  ctx: ToolContext;
  skills: readonly Skill[];
  defaultModel: string;
}

export interface AgentStats {
  skill: string;
  toolCalls: number;
}

export async function* runAgent(
  deps: AgentDependencies,
  /**
   * Full conversation history. The last entry MUST be the latest user
   * message; prior entries are earlier user/assistant turns the agent
   * needs to see for follow-up questions ("remember what I said?") to
   * resolve. Skill match runs against the latest user message; for the
   * LLM call we replace the latest user content with the slash-stripped
   * args so the prompt body the model sees doesn't contain the slash
   * trigger but earlier turns are preserved verbatim.
   *
   * Backwards-compat: a bare string is accepted and treated as a single
   * user turn (used by the CLI which is single-shot today).
   */
  input: string | ChatMessage[],
  /**
   * Optional AbortSignal forwarded into `adapter.chat({signal})`. When
   * the HTTP route observes a client disconnect (cancel button, browser
   * navigate), it passes `c.req.raw.signal` here so the underlying SDK
   * call aborts promptly instead of completing server-side and burning
   * provider tokens on a request the user already abandoned.
   */
  signal?: AbortSignal,
): AsyncGenerator<ChatEvent, AgentStats, void> {
  const history: ChatMessage[] = typeof input === 'string'
    ? [{ role: 'user', content: input }]
    : input;
  if (history.length === 0) {
    throw new Error('runAgent: empty messages array');
  }
  const latest = history[history.length - 1]!;
  if (latest.role !== 'user') {
    throw new Error('runAgent: last message must have role=user');
  }

  const matched = matchSkill(deps.skills, latest.content);
  if (!matched) {
    throw new Error(`no skill matched and no /ask fallback registered`);
  }

  const skillTools = (() => {
    if (!matched.skill.tools || matched.skill.tools.length === 0) {
      return deps.registry.toChatTools();
    }
    return deps.registry.filter(matched.skill.tools);
  })();

  let toolCalls = 0;

  // Replace the last user message's content with the slash-stripped args
  // so prior turns flow through verbatim and the agent sees full context.
  const llmMessages: ChatMessage[] = [
    ...history.slice(0, -1),
    { role: 'user', content: matched.args },
  ];

  const stream = deps.adapter.chat({
    model: matched.skill.model ?? deps.defaultModel,
    system: matched.skill.body,
    messages: llmMessages,
    tools: skillTools.length > 0 ? skillTools : undefined,
    toolHandler: skillTools.length > 0
      ? async (name, input) => deps.registry.run(name, input, deps.ctx)
      : undefined,
    ...(signal ? { signal } : {}),
  });

  // Track tool name by id so tool_call_end can include the tool label
  // even though tool_result doesn't carry the name on the wire.
  const toolNameById = new Map<string, string>();

  for await (const event of stream) {
    if (event.type === 'tool_use_complete') {
      toolCalls += 1;
      yield event;
      toolNameById.set(event.id, event.name);
      yield {
        type: 'tool_call_start',
        id: event.id,
        tool: event.name,
        args_summary: argsSummary(event.name, event.input),
      };
      continue;
    }
    if (event.type === 'tool_result') {
      yield event;
      const tool = toolNameById.get(event.id) ?? 'unknown';
      yield { type: 'tool_call_end', id: event.id, tool };
      continue;
    }
    if (event.type === 'message_stop') {
      // Translate the adapter's terminal usage payload into a public
      // usage_update event so the frontend can render context-window
      // accounting without coupling to the adapter wire format. Adapters
      // that don't surface usage (e.g. Claude Code SDK in some modes) emit
      // message_stop with usage undefined; we forward zeroes and the
      // frontend treats zero as unknown rather than erroring.
      yield {
        type: 'usage_update',
        input_tokens: event.usage?.input ?? 0,
        output_tokens: event.usage?.output ?? 0,
      };
      yield event;
      continue;
    }
    yield event;
  }

  return { skill: matched.skill.name, toolCalls };
}
