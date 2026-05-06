import type { ExtractResult } from './types.js';

// pdfjs-dist v4 ships an ESM legacy build that runs in Node without the
// browser worker. The default `pdfjs-dist` entry assumes a browser-like
// environment and trips on missing globals (DOMMatrix, etc.); the legacy
// build sidesteps those.
const pdfjsLib: typeof import('pdfjs-dist') = await import(
  'pdfjs-dist/legacy/build/pdf.mjs'
);

export async function extract(
  input: Buffer | string,
  _filename: string,
): Promise<ExtractResult> {
  if (typeof input === 'string') {
    return {
      text: '',
      warnings: ['pdf extractor received string; expected Buffer'],
    };
  }
  const data = new Uint8Array(input);
  let pdf: import('pdfjs-dist').PDFDocumentProxy;
  try {
    pdf = await pdfjsLib.getDocument({
      data,
      useWorkerFetch: false,
      isEvalSupported: false,
    }).promise;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { text: '', warnings: [`pdf parse failed: ${msg}`] };
  }
  const pages = pdf.numPages;
  const chunks: string[] = [];
  for (let i = 1; i <= pages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const items = content.items as Array<{ str?: string }>;
    chunks.push(items.map((it) => it.str ?? '').join(' '));
  }
  const text = chunks
    .join('\n\n')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .trim();
  const warnings: string[] = [];
  if (text.length === 0) {
    warnings.push('pdf appears scanned (zero extractable text characters)');
  }
  return { text, pages, warnings };
}
