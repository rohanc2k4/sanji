import { describe, expect, it } from 'vitest';
import type { Tool, ToolContext } from './types.js';
import { Registry } from './registry.js';

const stub: Tool = {
  name: 'echo',
  description: 'returns its input as a string',
  inputSchema: {
    type: 'object',
    properties: { msg: { type: 'string' } },
    required: ['msg'],
  },
  async run(input) {
    return JSON.stringify(input);
  },
};

describe('Registry', () => {
  it('registers and looks up by name', () => {
    const r = new Registry();
    r.register(stub);
    expect(r.get('echo')).toBe(stub);
    expect(r.get('missing')).toBeUndefined();
  });

  it('lists ChatTool descriptors', () => {
    const r = new Registry();
    r.register(stub);
    const list = r.toChatTools();
    expect(list).toHaveLength(1);
    expect(list[0]?.name).toBe('echo');
    expect(list[0]?.input_schema.required).toEqual(['msg']);
  });

  it('rejects duplicate registration', () => {
    const r = new Registry();
    r.register(stub);
    expect(() => r.register(stub)).toThrow(/already registered/);
  });

  it('runs by name with the given context', async () => {
    const r = new Registry();
    let seen: ToolContext | null = null;
    r.register({
      ...stub,
      async run(input, ctx) {
        seen = ctx;
        return JSON.stringify(input);
      },
    });
    const ctx = { vaultRoot: '/v', db: null, embedder: null, repo: null } as unknown as ToolContext;
    const out = await r.run('echo', { msg: 'hi' }, ctx);
    expect(out).toBe('{"msg":"hi"}');
    expect(seen).toBe(ctx);
  });

  it('returns a structured error string when a tool throws', async () => {
    const r = new Registry();
    r.register({ ...stub, async run() { throw new Error('boom'); } });
    const ctx = {} as ToolContext;
    const out = await r.run('echo', {}, ctx);
    expect(out).toMatch(/error.*boom/i);
  });
});
