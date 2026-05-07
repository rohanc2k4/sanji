const CHARS_PER_TOKEN = 4; // documented heuristic for the all-MiniLM family

export interface ChunkOptions {
  sizeTokens: number;
  overlapTokens: number;
}

export interface BodyChunk {
  text: string;
  startChar: number;
  endChar: number;
  headerTrail: string[];
}

// Backward-compatible alias for the chunk type.
export type Chunk = BodyChunk;

interface Section {
  text: string;
  startChar: number;
  trail: string[];
}

export function chunkBody(body: string, opts: ChunkOptions): BodyChunk[] {
  if (!body.length) return [];
  const sizeChars = opts.sizeTokens * CHARS_PER_TOKEN;
  const overlapChars = opts.overlapTokens * CHARS_PER_TOKEN;

  const sections = splitSections(body);
  const chunks: BodyChunk[] = [];

  for (const section of sections) {
    const paragraphs = splitParagraphs(section.text, section.startChar);
    let acc = '';
    let accStart = paragraphs[0]?.startChar ?? section.startChar;
    let accEnd = accStart;

    const flush = () => {
      if (acc.length) {
        chunks.push({ text: acc, startChar: accStart, endChar: accEnd, headerTrail: [...section.trail] });
        acc = '';
      }
    };

    for (const p of paragraphs) {
      const pEnd = p.startChar + p.text.length;
      if (p.text.length > sizeChars) {
        flush();
        for (const slice of sliceChars(p.text, sizeChars, overlapChars, p.startChar)) {
          chunks.push({ ...slice, headerTrail: [...section.trail] });
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
        chunks.push({ text: acc, startChar: accStart, endChar: accEnd, headerTrail: [...section.trail] });
        const overlapStart = Math.max(0, acc.length - overlapChars);
        const overlapText = acc.slice(overlapStart);
        acc = overlapText.length ? `${overlapText}\n\n${p.text}` : p.text;
        accStart = overlapText.length ? Math.max(0, accEnd - overlapText.length) : p.startChar;
        accEnd = pEnd;
      }
    }

    flush();
  }

  return chunks;
}

/**
 * Format a chunk for embedding by prepending the doc title and header trail
 * as ATX-style headings. The chunk body keeps its original text.
 */
export function formatChunkForEmbedding(
  chunk: BodyChunk,
  doc: { title: string | null },
): string {
  const trail = chunk.headerTrail ?? [];
  const hasTitle = doc.title != null && doc.title.length > 0;
  if (!hasTitle && trail.length === 0) return chunk.text;
  const lines: string[] = [];
  if (hasTitle) lines.push(`# ${doc.title}`);
  for (let i = 0; i < trail.length; i++) {
    const level = (hasTitle ? 2 : 1) + i;
    lines.push(`${'#'.repeat(level)} ${trail[i]}`);
  }
  lines.push('');
  lines.push(chunk.text);
  return lines.join('\n');
}

/**
 * Split the body into sections delimited by markdown headings. Each section
 * carries the header trail in effect at its start (i.e., after consuming any
 * leading heading). Headings inside fenced code blocks are ignored.
 */
function splitSections(body: string): Section[] {
  const lines = body.split('\n');
  const sections: Section[] = [];
  let currentTrail: string[] = [];
  let buf: string[] = [];
  let bufStart = 0;
  let bufTrail: string[] = [];
  let charOffset = 0;
  let inFence = false;

  const flush = () => {
    if (!buf.length) return;
    const text = buf.join('\n');
    if (text.trim().length === 0) return;
    sections.push({ text, startChar: bufStart, trail: [...bufTrail] });
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    const lineStart = charOffset;
    const lineEnd = charOffset + line.length;
    // detect fence toggles
    const fenceMatch = /^\s*(```|~~~)/.exec(line);
    if (fenceMatch) inFence = !inFence;

    let isHeading = false;
    let headingLevel = 0;
    let headingText = '';
    if (!inFence || fenceMatch) {
      // headings only outside fences. (a fence opener line is not a heading.)
      if (!inFence && !fenceMatch) {
        const m = /^(#{1,6})\s+(.+?)\s*#*\s*$/.exec(line);
        if (m) {
          isHeading = true;
          headingLevel = m[1]!.length;
          headingText = m[2]!.trim();
        }
      }
    }

    if (isHeading) {
      // close previous section
      flush();
      // update trail: truncate to level-1, then push
      currentTrail = currentTrail.slice(0, headingLevel - 1);
      currentTrail[headingLevel - 1] = headingText;
      currentTrail.length = headingLevel;
      // start new section with this heading line
      buf = [line];
      bufStart = lineStart;
      bufTrail = [...currentTrail];
    } else {
      if (!buf.length) {
        bufStart = lineStart;
        bufTrail = [...currentTrail];
      }
      buf.push(line);
    }

    // advance offset (line length + 1 for the consumed '\n', except after last line)
    charOffset = lineEnd + (i < lines.length - 1 ? 1 : 0);
  }

  flush();
  return sections;
}

function splitParagraphs(
  text: string,
  baseChar: number,
): Array<{ text: string; startChar: number }> {
  const out: Array<{ text: string; startChar: number }> = [];
  const re = /\n{2,}/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const part = text.slice(last, m.index);
    if (part.trim().length) out.push({ text: part, startChar: baseChar + last });
    last = m.index + m[0].length;
  }
  const tail = text.slice(last);
  if (tail.trim().length) out.push({ text: tail, startChar: baseChar + last });
  return out;
}

function sliceChars(
  text: string,
  size: number,
  overlap: number,
  baseChar: number,
): Array<{ text: string; startChar: number; endChar: number }> {
  const out: Array<{ text: string; startChar: number; endChar: number }> = [];
  const step = Math.max(1, size - overlap);
  for (let i = 0; i < text.length; i += step) {
    const end = Math.min(text.length, i + size);
    out.push({ text: text.slice(i, end), startChar: baseChar + i, endChar: baseChar + end });
    if (end === text.length) break;
  }
  return out;
}
