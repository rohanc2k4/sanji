/**
 * Map a tool name + raw input object to a short, human-readable phrase the
 * chat UI shows in the activity status line ("Searching for X", "Reading
 * Y"). Returned strings are designed to slot into the template:
 *
 *   ⟳ <args_summary> · <elapsed>s
 *
 * Unknown tools fall back to a generic "Running <tool>" string so the UI
 * never renders a blank status line; truncation guards against pathological
 * inputs (e.g. multi-kilobyte rewrite payloads on write_note).
 */
export function argsSummary(toolName: string, args: Record<string, unknown>): string {
  const a = args ?? {};
  const get = (k: string): string | undefined => {
    const v = (a as Record<string, unknown>)[k];
    return typeof v === 'string' && v.length > 0 ? v : undefined;
  };
  const trunc = (s: string, n = 80) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

  switch (toolName) {
    case 'grep_vault': {
      const pattern = get('pattern') ?? '';
      const folder = get('folder');
      if (folder) return trunc(`Searching ${folder} for "${pattern}"`);
      return trunc(`Searching for "${pattern}"`);
    }
    case 'read_note': {
      const path = get('path') ?? '';
      return trunc(`Reading ${path}`);
    }
    case 'list_vault': {
      const folder = get('folder');
      return folder ? trunc(`Listing ${folder}/`) : 'Listing vault root';
    }
    case 'hybrid_search': {
      const query = get('query') ?? '';
      return trunc(`Falling back to hybrid search for "${query}"`);
    }
    case 'write_note': {
      const path = get('path') ?? '';
      return trunc(`Writing note to ${path}`);
    }
    case 'semantic_search':
    case 'search_vault': {
      const query = get('query') ?? '';
      return trunc(`Legacy search for "${query}"`);
    }
    case 'get_neighbors': {
      const path = get('path') ?? '';
      return trunc(`Looking up neighbors of ${path}`);
    }
    default:
      return `Running ${toolName}`;
  }
}
