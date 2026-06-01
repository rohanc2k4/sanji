// The model sometimes emits math with LaTeX-style \(...\) / \[...\] delimiters
// instead of the $...$ / $$...$$ that remark-math understands, so it renders as
// raw jargon. Convert the LaTeX delimiters to dollar delimiters before markdown
// parsing. Fenced code blocks are left untouched — a code sample can legitimately
// contain `\(`, and we must not rewrite it into math there.
export function normalizeMath(text: string): string {
  // Splitting with a capturing group keeps the fenced blocks in the array at
  // odd indices; even indices are the prose segments we normalize.
  const parts = text.split(/(```[\s\S]*?```)/g);
  return parts
    .map((seg, i) => {
      if (i % 2 === 1) return seg; // fenced code block: leave as-is
      return seg
        .replace(/\\\[([\s\S]+?)\\\]/g, (_m, body) => `$$${body}$$`)
        .replace(/\\\(([\s\S]+?)\\\)/g, (_m, body) => `$${body}$`);
    })
    .join('');
}
