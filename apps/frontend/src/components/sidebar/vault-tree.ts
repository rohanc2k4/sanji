import type { NoteSummary } from '@sanji/shared';

export type TreeNode =
  | { kind: 'folder'; name: string; path: string; children: TreeNode[]; ephemeral: boolean }
  | { kind: 'note';   name: string; path: string; note: NoteSummary }
  | { kind: 'new-item'; parentPath: string; itemKind: 'note' | 'folder' };

function ensureFolder(parent: TreeNode[], name: string, path: string): TreeNode & { kind: 'folder' } {
  const existing = parent.find((n) => n.kind === 'folder' && n.name === name) as
    | (TreeNode & { kind: 'folder' })
    | undefined;
  if (existing) return existing;
  const folder: TreeNode & { kind: 'folder' } = {
    kind: 'folder', name, path, children: [], ephemeral: false,
  };
  parent.push(folder);
  return folder;
}

function sortNode(children: TreeNode[]) {
  children.sort((a, b) => {
    const aFolder = a.kind === 'folder';
    const bFolder = b.kind === 'folder';
    if (aFolder !== bFolder) return aFolder ? -1 : 1;
    const aName = 'name' in a ? a.name : '';
    const bName = 'name' in b ? b.name : '';
    return aName.localeCompare(bName);
  });
  for (const child of children) {
    if (child.kind === 'folder') sortNode(child.children);
  }
}

export function buildTree(notes: NoteSummary[], ephemeralFolders: Set<string>): TreeNode[] {
  const root: TreeNode[] = [];
  for (const note of notes) {
    const segments = note.path.split('/');
    let cursor = root;
    for (let i = 0; i < segments.length - 1; i++) {
      const partial = segments.slice(0, i + 1).join('/');
      cursor = ensureFolder(cursor, segments[i]!, partial).children;
    }
    cursor.push({ kind: 'note', name: segments[segments.length - 1]!, path: note.path, note });
  }
  // Inject ephemeral folders that have no real folder at the same path.
  for (const epath of ephemeralFolders) {
    const segments = epath.split('/');
    let cursor = root;
    for (let i = 0; i < segments.length; i++) {
      const partial = segments.slice(0, i + 1).join('/');
      const seg = segments[i]!;
      const found = cursor.find((n) => n.kind === 'folder' && n.name === seg) as
        | (TreeNode & { kind: 'folder' })
        | undefined;
      if (found) {
        cursor = found.children;
        continue;
      }
      const folder: TreeNode & { kind: 'folder' } = {
        kind: 'folder', name: seg, path: partial, children: [], ephemeral: true,
      };
      cursor.push(folder);
      cursor = folder.children;
    }
  }
  sortNode(root);
  return root;
}
