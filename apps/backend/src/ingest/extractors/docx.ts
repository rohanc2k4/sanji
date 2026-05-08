import type { ExtractResult } from './types.js';
import mammoth from 'mammoth';

export async function extract(
  input: Buffer | string,
  _filename: string,
): Promise<ExtractResult> {
  if (typeof input === 'string') {
    return {
      text: '',
      warnings: ['docx extractor received string; expected Buffer'],
    };
  }
  try {
    const r = await mammoth.extractRawText({ buffer: input });
    const text = r.value.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
    const warnings: string[] = r.messages
      .filter((m) => m.type === 'warning' || m.type === 'error')
      .map((m) => `mammoth: ${m.message}`);
    if (text.length === 0) warnings.push('docx had no extractable text');
    return { text, warnings };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { text: '', warnings: [`docx parse failed: ${msg}`] };
  }
}
