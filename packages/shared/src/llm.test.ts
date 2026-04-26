import { describe, expect, it } from 'vitest';
import type { ChatEvent, ChatTool } from './llm.js';

describe('llm types', () => {
  it('ChatTool has name + description + input_schema', () => {
    const t: ChatTool = {
      name: 'read_note',
      description: 'Read a markdown note from the vault.',
      input_schema: { type: 'object', properties: { path: { type: 'string' } }, required: ['path'] },
    };
    expect(t.name).toBe('read_note');
  });

  it('ChatEvent union includes tool-use variants', () => {
    const events: ChatEvent[] = [
      { type: 'text_delta', text: 'hi' },
      { type: 'tool_use_start', id: 't1', name: 'read_note' },
      { type: 'tool_use_input_delta', id: 't1', json: '{"pa' },
      { type: 'tool_use_complete', id: 't1', name: 'read_note', input: { path: 'a.md' } },
      { type: 'tool_result', id: 't1', content: 'ok' },
      { type: 'message_stop', usage: { input: 1, output: 1 } },
      { type: 'error', message: 'oops' },
    ];
    expect(events).toHaveLength(7);
  });
});
