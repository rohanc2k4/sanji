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
  let accEnd = accStart;

  for (const p of paragraphs) {
    const pEnd = p.startChar + p.text.length;
    if (p.text.length > sizeChars) {
      if (acc.length) {
        chunks.push({ text: acc, startChar: accStart, endChar: accEnd });
        acc = '';
      }
      for (const slice of sliceChars(p.text, sizeChars, overlapChars, p.startChar)) {
        chunks.push(slice);
      }
      accStart = pEnd;
      accEnd = pEnd;
      continue;
    }

    if (!acc.length) {
      acc = p.text;
      accStart = p.startChar;
      accEnd = pEnd;
    } else if (acc.length + 2 + p.text.length <= sizeChars) {
      acc = `${acc}\n\n${p.text}`;
      accEnd = pEnd;
    } else {
      chunks.push({ text: acc, startChar: accStart, endChar: accEnd });
      const overlapStart = Math.max(0, acc.length - overlapChars);
      const overlapText = acc.slice(overlapStart);
      acc = overlapText.length ? `${overlapText}\n\n${p.text}` : p.text;
      // overlapText is sliced from the synthetic join; its position in the
      // original body is approximate when paragraph separators exceed \n\n.
      accStart = overlapText.length ? Math.max(0, accEnd - overlapText.length) : p.startChar;
      accEnd = pEnd;
    }
  }

  if (acc.length) chunks.push({ text: acc, startChar: accStart, endChar: accEnd });
  return chunks;
}

function splitParagraphs(body: string): Array<{ text: string; startChar: number }> {
  const out: Array<{ text: string; startChar: number }> = [];
  const re = /\n{2,}/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(body)) !== null) {
    const part = body.slice(last, m.index);
    if (part.trim().length) out.push({ text: part, startChar: last });
    last = m.index + m[0].length;
  }
  const tail = body.slice(last);
  if (tail.trim().length) out.push({ text: tail, startChar: last });
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
