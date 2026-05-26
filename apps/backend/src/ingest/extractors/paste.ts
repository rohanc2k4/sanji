import type { ExtractResult } from './types.js';

export async function extract(
  input: Buffer | string,
  _filename: string,
): Promise<ExtractResult> {
  const raw = typeof input === 'string' ? input : input.toString('utf-8');
  const text = raw.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const warnings: string[] = [];
  if (text.length === 0) warnings.push('paste content was empty');
  return { text, warnings };
}
