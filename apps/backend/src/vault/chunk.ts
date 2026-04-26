const CHARS_PER_TOKEN = 4; // documented heuristic for the all-MiniLM family

export interface ChunkOptions {
  sizeTokens: number;
  overlapTokens: number;
}

export interface BodyChunk {
  text: string;
  startChar: number;
  endChar: number;
}

export function chunkBody(body: string, opts: ChunkOptions): BodyChunk[] {
  if (!body.length) return [];
  const sizeChars = opts.sizeTokens * CHARS_PER_TOKEN;
  const overlapChars = opts.overlapTokens * CHARS_PER_TOKEN;

  const paragraphs = splitParagraphs(body);
  const chunks: BodyChunk[] = [];
  let acc = '';
  let accStart = paragraphs[0]?.startChar ?? 0;

  for (const p of paragraphs) {
    if (p.text.length > sizeChars) {
      if (acc.length) {
        chunks.push({ text: acc, startChar: accStart, endChar: accStart + acc.length });
        acc = '';
      }
      for (const slice of sliceChars(p.text, sizeChars, overlapChars, p.startChar)) {
        chunks.push(slice);
      }
      accStart = p.startChar + p.text.length;
      continue;
    }

    if (!acc.length) {
      acc = p.text;
      accStart = p.startChar;
    } else if (acc.length + 2 + p.text.length <= sizeChars) {
      acc = `${acc}\n\n${p.text}`;
    } else {
      chunks.push({ text: acc, startChar: accStart, endChar: accStart + acc.length });
      const overlapStart = Math.max(0, acc.length - overlapChars);
      const overlapText = acc.slice(overlapStart);
      acc = overlapText.length ? `${overlapText}\n\n${p.text}` : p.text;
      accStart = accStart + overlapStart;
    }
  }

  if (acc.length) chunks.push({ text: acc, startChar: accStart, endChar: accStart + acc.length });
  return chunks;
}

function splitParagraphs(body: string): Array<{ text: string; startChar: number }> {
  const out: Array<{ text: string; startChar: number }> = [];
  const parts = body.split(/\n{2,}/);
  let cursor = 0;
  for (const part of parts) {
    const idx = body.indexOf(part, cursor);
    if (part.trim().length) out.push({ text: part, startChar: idx });
    cursor = idx + part.length;
  }
  return out;
}

function sliceChars(
  text: string,
  size: number,
  overlap: number,
  baseChar: number,
): BodyChunk[] {
  const out: BodyChunk[] = [];
  const step = Math.max(1, size - overlap);
  for (let i = 0; i < text.length; i += step) {
    const end = Math.min(text.length, i + size);
    out.push({ text: text.slice(i, end), startChar: baseChar + i, endChar: baseChar + end });
    if (end === text.length) break;
  }
  return out;
}
