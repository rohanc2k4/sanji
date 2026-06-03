// remark-math only recognizes $...$ / $$...$$. The model also emits \(...\) and
// \[...\]. This plugin converts those, but it runs as an mdast transform that
// touches ONLY `text` nodes. Inline code (`inlineCode`) and code blocks (`code`)
// are distinct node types, so code is never rewritten — unlike a raw string
// pass, a snippet like `f\(x\)` inside inline or indented code is left intact.
// Place it after remark-math in the plugin list so remark-math's mdast->hast
// math handlers are registered for the inlineMath/math nodes produced here.

// Loose node shape so we don't depend on mdast-util-math's augmented types.
type MdNode = { type: string; value?: string; children?: MdNode[] };

// Split a raw string into text + math/inlineMath nodes. \[...\] -> display math,
// \(...\) -> inline math. Pure and exported for tests. Returns one text node when
// there is no LaTeX.
export function splitLatexText(value: string): MdNode[] {
  const re = /\\\[([\s\S]+?)\\\]|\\\(([\s\S]+?)\\\)/g;
  const out: MdNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(value))) {
    if (m.index > last) out.push({ type: 'text', value: value.slice(last, m.index) });
    if (m[1] !== undefined) out.push({ type: 'math', value: m[1] });
    else out.push({ type: 'inlineMath', value: m[2]! });
    last = re.lastIndex;
  }
  if (out.length === 0) return [{ type: 'text', value }];
  if (last < value.length) out.push({ type: 'text', value: value.slice(last) });
  return out;
}

export function remarkLatexDelimiters() {
  return (tree: MdNode): void => walk(tree);
}

function walk(node: MdNode): void {
  if (!node || !Array.isArray(node.children)) return;
  const next: MdNode[] = [];
  for (const child of node.children) {
    if (child.type === 'text' && child.value && (child.value.includes('\\(') || child.value.includes('\\['))) {
      next.push(...splitLatexText(child.value));
    } else {
      walk(child);
      next.push(child);
    }
  }
  node.children = next;
}
