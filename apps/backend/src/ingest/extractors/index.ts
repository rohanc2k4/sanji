import type { FileFormat } from '@sanji/shared';
import type { ExtractResult } from './types.js';
import { extract as extractPdf } from './pdf.js';
import { extract as extractDocx } from './docx.js';
import { extract as extractTxt } from './txt.js';
import { extract as extractPaste } from './paste.js';

export type { ExtractResult } from './types.js';

export function detectFormat(filename: string): FileFormat {
  const lower = filename.toLowerCase();
  if (lower.endsWith('.pdf')) return 'pdf';
  if (lower.endsWith('.docx')) return 'docx';
  // .txt, .md, no-extension, anything else fall through to txt.
  return 'txt';
}

export async function extractByFormat(
  format: FileFormat,
  input: Buffer | string,
  filename: string,
): Promise<ExtractResult> {
  switch (format) {
    case 'pdf':
      return extractPdf(input, filename);
    case 'docx':
      return extractDocx(input, filename);
    case 'txt':
      return extractTxt(input, filename);
    case 'paste':
      return extractPaste(input, filename);
  }
}
