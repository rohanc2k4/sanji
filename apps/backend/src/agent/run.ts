import type { ChatEvent, ProviderAdapter } from '@sanji/shared';
import { matchSkill } from '../skills/match.js';
import type { Skill } from '../skills/parse.js';
import type { Registry } from '../tools/registry.js';
import type { ToolContext } from '../tools/types.js';

export interface AgentDependencies {
  adapter: ProviderAdapter;
  registry: Registry;
  ctx: ToolContext;
  skills: readonly Skill[];
  defaultModel: string;
  heavyModel?: string;
}

export interface AgentStats {
  skill: string;
  toolCalls: number;
}

export async function* runAgent(
  deps: AgentDependencies,
  message: string,
): AsyncGenerator<ChatEvent, AgentStats, void> {
  const matched = matchSkill(deps.skills, message);
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

  const stream = deps.adapter.chat({
    model: matched.skill.model ?? deps.defaultModel,
    system: matched.skill.body,
    messages: [{ role: 'user', content: matched.args }],
    tools: skillTools.length > 0 ? skillTools : undefined,
    toolHandler: skillTools.length > 0
      ? async (name, input) => deps.registry.run(name, input, deps.ctx)
      : undefined,
  });

  for await (const event of stream) {
    if (event.type === 'tool_use_complete') toolCalls += 1;
    yield event;
  }

  return { skill: matched.skill.name, toolCalls };
}
