import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';
import { z } from 'zod';
import type { ChatEvent, ChatMessage } from '@sanji/shared';
import type { AgentDependencies, AgentStats } from '../../agent/run.js';
import { runAgent as defaultRunAgent } from '../../agent/run.js';

const MessageSchema = z.object({
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string(),
});

const Body = z.object({
  messages: z.array(MessageSchema).min(1).refine(
    (msgs) => msgs[msgs.length - 1]!.role === 'user',
    { message: 'last message must have role=user' },
  ),
  model: z.string().optional(),
});

type RunAgentFn = (
  deps: AgentDependencies,
  input: string | ChatMessage[],
) => AsyncGenerator<ChatEvent, AgentStats, void>;

export function chatRoute(opts: { deps: AgentDependencies; runAgent?: RunAgentFn }) {
  const runAgent = opts.runAgent ?? defaultRunAgent;
  const r = new Hono();

  r.post('/api/chat', async (c) => {
    const parsed = Body.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) {
      return c.json(
        { kind: 'api-error', code: 'BAD_BODY', message: parsed.error.message },
        400,
      );
    }

    const deps = parsed.data.model
      ? { ...opts.deps, defaultModel: parsed.data.model }
      : opts.deps;

    // TEMP diagnostic: log incoming history length + roles so we can verify
    // conversation memory is reaching the backend. Remove after smoke confirms
    // the regression has a real fix.
    process.stderr.write(
      `[chat] received ${parsed.data.messages.length} message(s): ` +
        parsed.data.messages.map((m) => m.role).join(',') + '\n',
    );

    return streamSSE(c, async (stream) => {
      try {
        for await (const ev of runAgent(deps, parsed.data.messages)) {
          await stream.writeSSE({ event: ev.type, data: JSON.stringify(ev) });
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        await stream.writeSSE({
          event: 'error',
          data: JSON.stringify({ type: 'error', message: msg }),
        });
      }
    });
  });

  return r;
}
