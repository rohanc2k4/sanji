import type { Tool } from './types.js';

function validatePath(input: unknown): string {
  if (typeof input !== 'string' || !input.length) {
    throw new Error("'path' must be a non-empty string");
  }
  return input;
}

function validateDepth(input: unknown): 1 | 2 {
  const n = input ?? 1;
  if (n !== 1 && n !== 2) throw new Error("'depth' must be 1 or 2");
  return n as 1 | 2;
}

/** Slugs a note path can be referenced as: full-path-without-ext and basename-without-ext. */
function pathSlugCandidates(path: string): string[] {
  const noExt = path.replace(/\.md$/i, '');
  const basename = noExt.split('/').pop() ?? noExt;
  return Array.from(new Set([noExt, basename]));
}

interface Node {
  path: string;
  hops: number;
  kind: 'outbound' | 'inbound';
}

export const getNeighborsTool: Tool = {
  name: 'get_neighbors',
  description:
    "Walk the wikilink graph from a starting note. Returns connected notes up to depth 1 or 2, each tagged with hop count and direction (outbound link or inbound backlink). Slugs in [[wikilinks]] resolve against note basenames Obsidian-style.",
  inputSchema: {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: 'Vault-relative path of the starting note (e.g. "projects/argocd.md").',
      },
      depth: {
        type: 'number',
        description: 'Walk depth: 1 (direct neighbors) or 2 (neighbors-of-neighbors). Defaults to 1.',
      },
    },
    required: ['path'],
  },
  async run(input, ctx) {
    const path = validatePath(input.path);
    const depth = validateDepth(input.depth);

    // Build slug → path index from all known notes (case-insensitive, first-write-wins).
    const slugToPath = new Map<string, string>();
    for (const p of ctx.repo.allNotePaths()) {
      for (const candidate of pathSlugCandidates(p)) {
        const key = candidate.toLowerCase();
        if (!slugToPath.has(key)) slugToPath.set(key, p);
      }
    }

    const visited = new Set<string>([path]);
    const nodes: Node[] = [];
    const queue: Array<{ path: string; hops: number }> = [{ path, hops: 0 }];

    while (queue.length) {
      const cur = queue.shift()!;
      if (cur.hops >= depth) continue;

      // Outbound: follow wikilinks from cur.path
      for (const link of ctx.repo.outboundLinks(cur.path)) {
        const resolved = slugToPath.get(link.targetSlug.toLowerCase());
        if (!resolved || visited.has(resolved)) continue;
        visited.add(resolved);
        nodes.push({ path: resolved, hops: cur.hops + 1, kind: 'outbound' });
        if (cur.hops + 1 < depth) queue.push({ path: resolved, hops: cur.hops + 1 });
      }

      // Inbound: notes whose wikilinks point at any of cur.path's slugs
      const seenInbound = new Set<string>();
      for (const slug of pathSlugCandidates(cur.path)) {
        for (const link of ctx.repo.inboundLinks(slug)) {
          if (seenInbound.has(link.sourcePath)) continue;
          seenInbound.add(link.sourcePath);
          if (visited.has(link.sourcePath)) continue;
          visited.add(link.sourcePath);
          nodes.push({ path: link.sourcePath, hops: cur.hops + 1, kind: 'inbound' });
          if (cur.hops + 1 < depth) queue.push({ path: link.sourcePath, hops: cur.hops + 1 });
        }
      }
    }

    return JSON.stringify({ path, depth, nodes });
  },
};
