import { useEffect, useMemo, useState } from 'react';
import { ChevronRight, FileText, Inbox, Plus } from 'lucide-react';
import type { NoteSummary } from '@sanji/shared';
import { isApiError } from '@sanji/shared';
import { listNotes } from '@/api/vault';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

export interface SourcesSidebarProps {
  selectedPath: string | null;
  onSelect: (path: string) => void;
  onAddSource: () => void;
  refreshKey?: number;
}

interface TreeNode {
  name: string;
  path: string;
  isLeaf: boolean;
  children: TreeNode[];
  note?: NoteSummary;
}

function buildTree(notes: NoteSummary[]): TreeNode[] {
  const root: TreeNode = { name: '', path: '', isLeaf: false, children: [] };
  for (const note of notes) {
    const segments = note.path.split('/');
    let cursor = root;
    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i]!;
      const isLast = i === segments.length - 1;
      const partialPath = segments.slice(0, i + 1).join('/');
      let next = cursor.children.find((c) => c.name === seg && c.isLeaf === isLast);
      if (!next) {
        next = {
          name: seg,
          path: isLast ? note.path : partialPath,
          isLeaf: isLast,
          children: [],
          ...(isLast ? { note } : {}),
        };
        cursor.children.push(next);
      }
      cursor = next;
    }
  }
  function sortNode(n: TreeNode) {
    n.children.sort((a, b) => {
      if (a.isLeaf !== b.isLeaf) return a.isLeaf ? 1 : -1;
      return a.name.localeCompare(b.name);
    });
    for (const c of n.children) sortNode(c);
  }
  sortNode(root);
  return root.children;
}

function relTime(ms: number): string {
  const diff = Date.now() - ms;
  if (diff < 60_000) return 'just now';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  if (diff < 604_800_000) return `${Math.floor(diff / 86_400_000)}d ago`;
  return new Date(ms).toLocaleDateString();
}

interface TreeRowProps {
  node: TreeNode;
  depth: number;
  selectedPath: string | null;
  onSelect: (path: string) => void;
}

function TreeRow({ node, depth, selectedPath, onSelect }: TreeRowProps) {
  const indent = 8 + depth * 12;
  if (node.isLeaf) {
    const note = node.note!;
    const isSelected = selectedPath === note.path;
    const label = note.title ?? node.name.replace(/\.md$/, '');
    return (
      <li>
        <button
          type="button"
          onClick={() => onSelect(note.path)}
          title={`${note.path} · ${relTime(note.mtimeMs)}`}
          style={{ paddingLeft: indent }}
          className={[
            'relative flex h-7 w-full items-center gap-1.5 rounded pr-2 text-left text-sm',
            'transition-colors hover:bg-muted/40',
            isSelected
              ? 'text-foreground before:absolute before:left-0 before:top-1/2 before:h-5 before:w-[2px] before:-translate-y-1/2 before:bg-primary'
              : 'text-foreground/85 hover:text-foreground',
          ].join(' ')}
        >
          <FileText className="size-3.5 shrink-0 text-muted-foreground/60" />
          <span className="truncate">{label}</span>
        </button>
      </li>
    );
  }
  return (
    <li>
      <details open className="[&[open]>summary>svg.chev]:rotate-90">
        <summary
          style={{ paddingLeft: indent }}
          className="flex h-7 cursor-pointer select-none items-center gap-1 rounded pr-2 text-sm text-muted-foreground transition-colors hover:bg-muted/30 hover:text-foreground [&::-webkit-details-marker]:hidden"
        >
          <ChevronRight className="chev size-3.5 shrink-0 transition-transform" />
          <span className="truncate font-medium">{node.name}</span>
        </summary>
        <ul>
          {node.children.map((c) => (
            <TreeRow
              key={c.isLeaf ? c.path : `${c.path}/`}
              node={c}
              depth={depth + 1}
              selectedPath={selectedPath}
              onSelect={onSelect}
            />
          ))}
        </ul>
      </details>
    </li>
  );
}

type LoadState =
  | { kind: 'loading' }
  | { kind: 'no-vault' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; tree: TreeNode[] };

export function SourcesSidebar({ selectedPath, onSelect, onAddSource, refreshKey = 0 }: SourcesSidebarProps) {
  const [state, setState] = useState<LoadState>({ kind: 'loading' });
  const [reloadKey, setReloadKey] = useState(0);
  const [autoRetried, setAutoRetried] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setState({ kind: 'loading' });
    listNotes()
      .then((rows) => {
        if (!cancelled) setState({ kind: 'ready', tree: buildTree(rows) });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        if (isApiError(err) && err.code === 'HTTP_404') {
          setState({ kind: 'no-vault' });
        } else if (isApiError(err)) {
          setState({ kind: 'error', message: `${err.code} — ${err.message}` });
        } else if (err instanceof Error) {
          setState({ kind: 'error', message: err.message });
        } else {
          setState({ kind: 'error', message: String(err) });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [reloadKey, refreshKey]);

  const isReadyEmpty = state.kind === 'ready' && state.tree.length === 0;

  // First-mount-after-onboarding race: ChatShell typically mounts a beat
  // before the indexer finishes inserting the initial batch of notes, so
  // the first listNotes() call returns []. Retry once after a short delay
  // before falling back to the empty state, so the user doesn't have to
  // hit Retry manually on a fresh setup.
  useEffect(() => {
    if (!isReadyEmpty || autoRetried) return;
    const timer = setTimeout(() => {
      setAutoRetried(true);
      setReloadKey((k) => k + 1);
    }, 2000);
    return () => clearTimeout(timer);
  }, [isReadyEmpty, autoRetried]);

  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground/70">
          Sources
        </span>
        <Button
          size="icon-xs"
          variant="ghost"
          onClick={onAddSource}
          aria-label="Add source"
          title="Add source"
        >
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
            <Button size="sm" variant="outline" onClick={() => setReloadKey((k) => k + 1)}>
              Retry
            </Button>
          </div>
        )}

        {state.kind === 'ready' && state.tree.length > 0 && (
          <ul className="px-1 pb-2">
            {state.tree.map((n) => (
              <TreeRow
                key={n.isLeaf ? n.path : `${n.path}/`}
                node={n}
                depth={0}
                selectedPath={selectedPath}
                onSelect={onSelect}
              />
            ))}
          </ul>
        )}
      </ScrollArea>

      <div className="shrink-0 border-t border-border p-2">
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-muted-foreground hover:text-foreground"
          onClick={() => onSelect(`inbox/untitled-${Date.now()}.md`)}
        >
          <Plus />
          <span>New note</span>
        </Button>
      </div>
    </div>
  );
}
