import type { ChatEvent, ProviderAdapter } from '@sanji/shared';
import type { Skill } from './parse.js';

export interface RunSkillOptions {
  skill: Skill;
  input: string;
  adapter: ProviderAdapter;
  model: string;
  abortSignal?: AbortSignal;
}

export interface RunSkillResult {
  text: string;
  usage?: { input: number; output: number };
}

/**
 * One-shot LLM call against a skill, returning both the aggregated text and
 * the usage block from the terminal `message_stop` event. Loads the skill
 * body as system prompt, sends `input` as a single user message, aggregates
 * text_delta events, captures the `message_stop.usage` block. No tool loop.
 */
export async function runSkillWithUsage(opts: RunSkillOptions): Promise<RunSkillResult> {
  if (opts.abortSignal?.aborted) {
    throw new Error('runSkill aborted before start');
  }
  let output = '';
  let usage: { input: number; output: number } | undefined;
  const stream = opts.adapter.chat({
    model: opts.model,
    system: opts.skill.body,
    messages: [{ role: 'user', content: opts.input }],
    ...(opts.abortSignal ? { signal: opts.abortSignal } : {}),
  });
  for await (const ev of stream as AsyncIterable<ChatEvent>) {
    if (opts.abortSignal?.aborted) {
      throw new Error('runSkill aborted mid-stream');
    }
    if (ev.type === 'text_delta') output += ev.text;
    if (ev.type === 'message_stop' && ev.usage) usage = ev.usage;
    if (ev.type === 'error') throw new Error(`runSkill provider error: ${ev.message}`);
  }
  return { text: output, usage };
}

/**
 * Thin wrapper around `runSkillWithUsage` that drops the usage block. Existing
 * callers that don't care about token counts use this. Same semantics as
 * before: aggregate text_delta events into a single string.
 */
export async function runSkill(opts: RunSkillOptions): Promise<string> {
  return (await runSkillWithUsage(opts)).text;
}
