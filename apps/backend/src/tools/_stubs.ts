import type { Tool } from './types.js';

export const stubReadNote: Tool = {
  name: 'read_note',
  description: '[STUB v0.1 week 2] Read a note. Returns a placeholder.',
  inputSchema: { type: 'object', properties: { path: { type: 'string' } }, required: ['path'] },
  async run(input) { return `[stub read_note] would read ${JSON.stringify(input)}`; },
};

export const stubSearchVault: Tool = {
  name: 'search_vault',
  description: '[STUB] FTS5 keyword search.',
  inputSchema: {
    type: 'object',
    properties: { query: { type: 'string' }, limit: { type: 'number' } },
    required: ['query'],
  },
  async run(input) { return `[stub search_vault] ${JSON.stringify(input)}`; },
};

export const stubSemanticSearch: Tool = {
  name: 'semantic_search',
  description: '[STUB] Semantic search over chunk embeddings.',
  inputSchema: {
    type: 'object',
    properties: { query: { type: 'string' }, limit: { type: 'number' } },
    required: ['query'],
  },
  async run(input) { return `[stub semantic_search] ${JSON.stringify(input)}`; },
};

export const stubGetNeighbors: Tool = {
  name: 'get_neighbors',
  description: '[STUB] Walk the wikilink graph.',
  inputSchema: {
    type: 'object',
    properties: { path: { type: 'string' }, depth: { type: 'number' } },
    required: ['path'],
  },
  async run(input) { return `[stub get_neighbors] ${JSON.stringify(input)}`; },
};

export const stubWriteNote: Tool = {
  name: 'write_note',
  description: '[STUB] Atomic write into the vault.',
  inputSchema: {
    type: 'object',
    properties: { path: { type: 'string' }, content: { type: 'string' } },
    required: ['path', 'content'],
  },
  async run(input) { return `[stub write_note] would write ${JSON.stringify(input)}`; },
};

export const ALL_STUBS = [
  stubReadNote,
  stubSearchVault,
  stubSemanticSearch,
  stubGetNeighbors,
  stubWriteNote,
];
