import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';
import { z } from 'zod';
import type { ChatEvent } from '@sanji/shared';
import type { AgentDependencies, AgentStats } from '../../agent/run.js';
import { runAgent as defaultRunAgent } from '../../agent/run.js';

const Body = z.object({
  message: z.string().min(1),
  model: z.string().optional(),
});

type RunAgentFn = (
  deps: AgentDependencies,
  msg: string,
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

    return streamSSE(c, async (stream) => {
      try {
        for await (const ev of runAgent(deps, parsed.data.message)) {
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
