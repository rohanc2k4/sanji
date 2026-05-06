import type { ChatEvent, ProviderAdapter } from '@sanji/shared';
import type { Skill } from './parse.js';

export interface RunSkillOptions {
  skill: Skill;
  input: string;
  adapter: ProviderAdapter;
  model: string;
  abortSignal?: AbortSignal;
}

/**
 * One-shot LLM call against a skill. Loads the skill body as system prompt,
 * sends `input` as a single user message, aggregates text_delta events into
 * the final string. No tool loop. The agent loop is the other invocation
 * mode for skills (multi-turn-with-tools).
 */
export async function runSkill(opts: RunSkillOptions): Promise<string> {
  if (opts.abortSignal?.aborted) {
    throw new Error('runSkill aborted before start');
  }
  let output = '';
  const stream = opts.adapter.chat({
    model: opts.model,
    system: opts.skill.body,
    messages: [{ role: 'user', content: opts.input }],
  });
  for await (const ev of stream as AsyncIterable<ChatEvent>) {
    if (opts.abortSignal?.aborted) {
      throw new Error('runSkill aborted mid-stream');
    }
    if (ev.type === 'text_delta') output += ev.text;
    if (ev.type === 'error') throw new Error(`runSkill provider error: ${ev.message}`);
  }
  return output;
}
