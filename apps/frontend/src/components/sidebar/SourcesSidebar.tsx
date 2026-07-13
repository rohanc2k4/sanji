import { useEffect, useMemo, useRef, useState } from 'react';
import { Inbox, Plus, FolderPlus } from 'lucide-react';
import { toast } from 'sonner';
import { isApiError, type NoteSummary } from '@sanji/shared';
import { listNotes } from '@/api/vault';
import { renameNote } from '@/api/notes';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { buildTree, type TreeNode } from './vault-tree';
import { TreeRow, type DragPayload } from './TreeRow';
import { useSidebarOps } from './useSidebarOps';
import { DeleteConfirmDialog, type DeleteTarget } from './DeleteConfirmDialog';

export interface SourcesSidebarProps {
  selectedPath: string | null;
  onSelect: (path: string) => void;
  onAddSource: () => void;
  refreshKey?: number;
  onRenamed?: (from: string, to: string) => void;
  onDeleted?: (path: string) => void;
  onFolderMoved?: (from: string, to: string) => void;
  onFolderDeleted?: (path: string) => void;
}

type LoadState =
  | { kind: 'loading' }
  | { kind: 'no-vault' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; rows: NoteSummary[] };

function containsFolderAtPath(tree: TreeNode[], path: string): boolean {
  for (const node of tree) {
    if (node.kind !== 'folder') continue;
    if (node.path === path) return true;
    if (path.startsWith(`${node.path}/`)) {
      return containsFolderAtPath(node.children, path);
    }
  }
  return false;
}

function collectNotePaths(folder: TreeNode & { kind: 'folder' }): string[] {
  const out: string[] = [];
  const stack: TreeNode[] = [...folder.children];
  while (stack.length) {
    const n = stack.pop()!;
    if (n.kind === 'note') out.push(n.path);
    else if (n.kind === 'folder') stack.push(...n.children);
  }
  return out;
}

export function SourcesSidebar(props: SourcesSidebarProps) {
  const {
    selectedPath, onSelect, onAddSource, refreshKey = 0,
    onRenamed, onDeleted, onFolderMoved, onFolderDeleted,
  } = props;

  const [state, setState] = useState<LoadState>({ kind: 'loading' });
  const [dragging, setDragging] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [autoRetried, setAutoRetried] = useState(false);
  const [renamingPath, setRenamingPath] = useState<string | null>(null);
  const [newItemAtParent, setNewItemAtParent] = useState<{ parentPath: string; itemKind: 'note' | 'folder' } | null>(null);
  const [ephemeralFolders, setEphemeralFolders] = useState<Set<string>>(new Set());
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const renameInFlight = useRef(false);

  const ops = useSidebarOps({
    onReload: () => setReloadKey((k) => k + 1),
    onRenamed,
    onDeleted,
    onFolderMoved,
    onFolderDeleted,
  });

  useEffect(() => {
    let cancelled = false;
    setState({ kind: 'loading' });
    listNotes()
      .then((rows) => {
        if (cancelled) return;
        // Store raw rows; the display tree is derived from rows + ephemeralFolders
        // via useMemo so ephemeral folder additions appear immediately without
        // requiring a reload.
        setState({ kind: 'ready', rows });
        // Prune ephemeral folders that have materialized (a note is now under them).
        setEphemeralFolders((prev) => {
          if (prev.size === 0) return prev;
          const realTree = buildTree(rows, new Set());
          let changed = false;
          const next = new Set(prev);
          for (const path of prev) {
            if (containsFolderAtPath(realTree, path)) {
              next.delete(path);
              changed = true;
            }
          }
          return changed ? next : prev;
        });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        if (isApiError(err) && err.code === 'HTTP_404') setState({ kind: 'no-vault' });
        else if (isApiError(err)) setState({ kind: 'error', message: `${err.code} — ${err.message}` });
        else if (err instanceof Error) setState({ kind: 'error', message: err.message });
        else setState({ kind: 'error', message: String(err) });
      });
    return () => { cancelled = true; };
  }, [reloadKey, refreshKey]);

  // Derive the display tree on every render so ephemeral folder additions
  // (which don't trigger a listNotes reload) appear immediately.
  const displayTree = useMemo(
    () => (state.kind === 'ready' ? buildTree(state.rows, ephemeralFolders) : []),
    [state, ephemeralFolders],
  );

  const isReadyEmpty = state.kind === 'ready' && displayTree.length === 0;
  useEffect(() => {
    if (!isReadyEmpty || autoRetried) return;
    const timer = setTimeout(() => {
      setAutoRetried(true);
      setReloadKey((k) => k + 1);
    }, 2000);
    return () => clearTimeout(timer);
  }, [isReadyEmpty, autoRetried]);

  async function commitRename(from: string, draft: string) {
    if (renameInFlight.current) return;
    const trimmed = draft.trim();
    if (!trimmed) { setRenamingPath(null); return; }
    if (trimmed.includes('/')) {
      toast.error('Rename failed', { description: 'Slashes are not allowed; use drag-drop to move.' });
      setRenamingPath(null);
      return;
    }

    const isFolderRename =
      ephemeralFolders.has(from) ||
      containsFolderAtPath(displayTree, from);

    if (isFolderRename) {
      if (ephemeralFolders.has(from)) {
        const parent = from.includes('/') ? from.slice(0, from.lastIndexOf('/')) : '';
        const to = parent ? `${parent}/${trimmed}` : trimmed;
        if (to === from) { setRenamingPath(null); return; }
        setEphemeralFolders((prev) => {
          const next = new Set<string>();
          for (const p of prev) {
            if (p === from) next.add(to);
            else if (p.startsWith(`${from}/`)) next.add(`${to}${p.slice(from.length)}`);
            else next.add(p);
          }
          return next;
        });
        setRenamingPath(null);
        return;
      }
      const parent = from.includes('/') ? from.slice(0, from.lastIndexOf('/')) : '';
      const to = parent ? `${parent}/${trimmed}` : trimmed;
      if (to === from) { setRenamingPath(null); return; }
      renameInFlight.current = true;
      try { await ops.moveFolder(from, to); }
      catch { /* toast already shown */ }
      finally { renameInFlight.current = false; setRenamingPath(null); }
      return;
    }

    // Note rename
    const oldBasename = from.split('/').pop()!.replace(/\.md$/, '');
    if (trimmed === oldBasename) { setRenamingPath(null); return; }
    const parent = from.includes('/') ? from.slice(0, from.lastIndexOf('/')) : '';
    const basename = trimmed.endsWith('.md') ? trimmed : `${trimmed}.md`;
    const to = parent ? `${parent}/${basename}` : basename;
    if (to === from) { setRenamingPath(null); return; }
    renameInFlight.current = true;
    try {
      await renameNote(from, to);
      setRenamingPath(null);
      setReloadKey((k) => k + 1);
      onRenamed?.(from, to);
    } catch (err) {
      const msg = isApiError(err) ? err.message : err instanceof Error ? err.message : String(err);
      toast.error('Rename failed', { description: msg });
      setRenamingPath(null);
    } finally {
      renameInFlight.current = false;
    }
  }

  async function commitCreate(parentPath: string, itemKind: 'note' | 'folder', draft: string) {
    const trimmed = draft.trim();
    if (!trimmed) { setNewItemAtParent(null); return; }
    if (trimmed.includes('/')) {
      toast.error(`Create ${itemKind} failed`, { description: 'Slashes are not allowed.' });
      return;
    }
    if (itemKind === 'folder') {
      const path = parentPath ? `${parentPath}/${trimmed}` : trimmed;
      if (ephemeralFolders.has(path)) {
        toast.error('Folder pending', { description: `A folder named ${trimmed} is already pending.` });
        return;
      }
      setEphemeralFolders((prev) => new Set(prev).add(path));
      setNewItemAtParent(null);
      return;
    }
    const filename = trimmed.endsWith('.md') ? trimmed : `${trimmed}.md`;
    const path = parentPath ? `${parentPath}/${filename}` : filename;
    try {
      await ops.createNote(path);
      setNewItemAtParent(null);
      onSelect(path);
    } catch { /* toast already shown */ }
  }

  function onStartDelete(node: TreeNode) {
    if (node.kind === 'folder') {
      if (node.ephemeral) {
        setEphemeralFolders((prev) => {
          const next = new Set(prev);
          next.delete(node.path);
          return next;
        });
        return;
      }
      const contained = collectNotePaths(node);
      setDeleteTarget({ kind: 'folder', path: node.path, name: node.name, containedNotes: contained });
    } else if (node.kind === 'note') {
      setDeleteTarget({ kind: 'note', path: node.path, name: node.name });
    }
  }

  async function onConfirmDelete() {
    if (!deleteTarget) return;
    const target = deleteTarget;
    setDeleteTarget(null);
    try {
      if (target.kind === 'note') await ops.deleteNote(target.path);
      else await ops.deleteFolder(target.path);
    } catch { /* toast already shown */ }
  }

  async function onDropOnRoot(payload: DragPayload) {
    setDragging(false);
    if (payload.kind === 'note') {
      const currentParent = payload.path.includes('/')
        ? payload.path.slice(0, payload.path.lastIndexOf('/'))
        : '';
      if (currentParent === '') return; // already at root, no-op
      try { await ops.moveNote(payload.path, ''); } catch { /* toast shown */ }
      return;
    }
    // folder
    if (!payload.path.includes('/')) return; // already at root, no-op
    const basename = payload.path.split('/').pop()!;
    try { await ops.moveFolder(payload.path, basename); } catch { /* toast shown */ }
  }

  async function onDropOnFolder(payload: DragPayload, target: TreeNode & { kind: 'folder' }) {
    if (payload.kind === 'note') {
      const currentParent = payload.path.includes('/') ? payload.path.slice(0, payload.path.lastIndexOf('/')) : '';
      if (currentParent === target.path) return;
      try { await ops.moveNote(payload.path, target.path); } catch { /* toast */ }
      return;
    }
    if (payload.path === target.path) return;
    const to = `${target.path}/${payload.path.split('/').pop()!}`;
    try { await ops.moveFolder(payload.path, to); } catch { /* toast */ }
  }

  function rowKey(n: TreeNode): string {
    if (n.kind === 'folder') return `folder:${n.path}`;
    if (n.kind === 'note') return `note:${n.path}`;
    return `new-item:${n.parentPath}:${n.itemKind}`;
  }

  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground/70">Sources</span>
        <Button size="icon-xs" variant="ghost" onClick={onAddSource} aria-label="Add source" title="Add source">
          <Plus />
        </Button>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        {state.kind === 'loading' && (
          <div className="space-y-1.5 px-3 pb-3" role="status" aria-label="Loading notes">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-7 animate-pulse rounded bg-muted/60" />
            ))}
          </div>
        )}
        {(state.kind === 'no-vault' || isReadyEmpty) && (
          <div className="flex flex-col items-center px-4 pt-2 pb-4 text-center">
            <Inbox className="mb-2 size-6 text-muted-foreground/50" aria-hidden />
            <p className="mb-1 text-sm font-medium text-foreground">No sources ingested</p>
            <p className="text-xs leading-relaxed text-muted-foreground/70">
              Point Sanji at a markdown vault to start. Notes will appear here once indexing completes.
            </p>
          </div>
        )}
        {state.kind === 'error' && (
          <div className="px-4 pb-3 text-xs text-muted-foreground">
            <p className="mb-1.5 text-foreground">Could not load notes.</p>
            <p className="mb-3 break-words text-muted-foreground/70">{state.message}</p>
            <Button size="sm" variant="outline" onClick={() => setReloadKey((k) => k + 1)}>Retry</Button>
          </div>
        )}
        {state.kind === 'ready' && displayTree.length > 0 && (
          <ul
            className="px-1 pb-2"
            onDragStart={() => setDragging(true)}
            onDragEnd={() => setDragging(false)}
          >
            {dragging && (
              <li>
                <div
                  data-root-dropzone
                  onDragOver={(e) => {
                    if (Array.from(e.dataTransfer.types).includes('application/x-sanji-path')) {
                      e.preventDefault();
                    }
                  }}
                  onDrop={(e) => {
                    const raw = e.dataTransfer.getData('application/x-sanji-path');
                    if (!raw) return;
                    onDropOnRoot(JSON.parse(raw) as DragPayload);
                  }}
                  className="mx-1 mb-1 flex h-7 items-center justify-center rounded border border-dashed border-border text-xs text-muted-foreground"
                >
                  Move to root
                </div>
              </li>
            )}
            {displayTree.map((n) => (
              <TreeRow
                key={rowKey(n)}
                node={n}
                depth={0}
                selectedPath={selectedPath}
                renamingPath={renamingPath}
                newItemAtParent={newItemAtParent}
                onSelect={onSelect}
                onStartRename={setRenamingPath}
                onCommitRename={commitRename}
                onCancelRename={() => setRenamingPath(null)}
                onStartDelete={onStartDelete}
                onStartCreate={(parentPath, itemKind) => setNewItemAtParent({ parentPath, itemKind })}
                onCommitCreate={commitCreate}
                onCancelCreate={() => setNewItemAtParent(null)}
                onDropOnFolder={onDropOnFolder}
              />
            ))}
            {newItemAtParent && newItemAtParent.parentPath === '' && (
              <TreeRow
                node={{ kind: 'new-item', parentPath: '', itemKind: newItemAtParent.itemKind }}
                depth={0}
                selectedPath={selectedPath}
                renamingPath={renamingPath}
                newItemAtParent={newItemAtParent}
                onSelect={onSelect}
                onStartRename={setRenamingPath}
                onCommitRename={commitRename}
                onCancelRename={() => setRenamingPath(null)}
                onStartDelete={onStartDelete}
                onStartCreate={() => {}}
                onCommitCreate={commitCreate}
                onCancelCreate={() => setNewItemAtParent(null)}
                onDropOnFolder={onDropOnFolder}
              />
            )}
          </ul>
        )}
      </ScrollArea>

      <div className="shrink-0 border-t border-border p-2 flex gap-1">
        <Button
          variant="ghost"
          size="sm"
          className="flex-1 justify-start text-muted-foreground hover:text-foreground"
          onClick={() => setNewItemAtParent({ parentPath: '', itemKind: 'note' })}
        ><Plus /><span>Note</span></Button>
        <Button
          variant="ghost"
          size="sm"
          className="flex-1 justify-start text-muted-foreground hover:text-foreground"
          onClick={() => setNewItemAtParent({ parentPath: '', itemKind: 'folder' })}
        ><FolderPlus /><span>Folder</span></Button>
      </div>

      {deleteTarget && (
        <DeleteConfirmDialog
          target={deleteTarget}
          onConfirm={onConfirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
