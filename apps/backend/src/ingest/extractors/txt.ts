import type { ExtractResult } from './types.js';

export async function extract(
  input: Buffer | string,
  _filename: string,
): Promise<ExtractResult> {
  let raw = typeof input === 'string' ? input : input.toString('utf-8');
  // Strip UTF-8 BOM if present.
  if (raw.charCodeAt(0) === 0xfeff) raw = raw.slice(1);
  const text = raw.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const warnings: string[] = [];
  if (text.length === 0) warnings.push('txt file was empty');
  return { text, warnings };
}
