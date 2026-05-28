import { useState } from 'react';
import { ChevronRight, FileText, Pencil, Plus, Trash2 } from 'lucide-react';
import { RenameRow } from './RenameRow';
import { NewItemRow } from './NewItemRow';
import type { TreeNode } from './vault-tree';

export interface DragPayload { kind: 'note' | 'folder'; path: string }

export interface TreeRowProps {
  node: TreeNode;
  depth: number;
  selectedPath: string | null;
  renamingPath: string | null;
  newItemAtParent: { parentPath: string; itemKind: 'note' | 'folder' } | null;
  onSelect: (path: string) => void;
  onStartRename: (path: string) => void;
  onCommitRename: (from: string, draft: string) => void;
  onCancelRename: () => void;
  onStartDelete: (node: TreeNode) => void;
  onStartCreate: (parentPath: string, itemKind: 'note' | 'folder') => void;
  onCommitCreate: (parentPath: string, itemKind: 'note' | 'folder', draft: string) => void;
  onCancelCreate: () => void;
  onDropOnFolder: (payload: DragPayload, target: TreeNode & { kind: 'folder' }) => void;
}

function relTime(ms: number): string {
  const diff = Date.now() - ms;
  if (diff < 60_000) return 'just now';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  if (diff < 604_800_000) return `${Math.floor(diff / 86_400_000)}d ago`;
  return new Date(ms).toLocaleDateString();
}

function rowKey(c: TreeNode): string {
  if (c.kind === 'folder') return `folder:${c.path}`;
  if (c.kind === 'note') return `note:${c.path}`;
  if (c.kind === 'rename') return `rename:${c.path}`;
  return `new-item:${c.parentPath}:${c.itemKind}`;
}

export function TreeRow(props: TreeRowProps) {
  const { node, depth } = props;
  const indent = 8 + depth * 12;
  const [pickerOpen, setPickerOpen] = useState(false);

  if (node.kind === 'note') {
    const isRenaming = props.renamingPath === node.path;
    if (isRenaming) {
      return (
        <li>
          <RenameRow
            indent={indent}
            initialDraft={node.name.replace(/\.md$/, '')}
            onCommit={(d) => props.onCommitRename(node.path, d)}
            onCancel={props.onCancelRename}
          />
        </li>
      );
    }
    const label = node.name.replace(/\.md$/, '');
    const isSelected = props.selectedPath === node.path;
    return (
      <li>
        <div
          data-row
          className="group relative"
          onDragOver={(e) => {
            const types = Array.from(e.dataTransfer.types);
            if (types.includes('application/x-sanji-path')) e.preventDefault();
          }}
        >
          <button
            type="button"
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData(
                'application/x-sanji-path',
                JSON.stringify({ kind: 'note', path: node.path }),
              );
              e.dataTransfer.effectAllowed = 'move';
            }}
            onClick={() => props.onSelect(node.path)}
            onDoubleClick={(e) => { e.preventDefault(); props.onStartRename(node.path); }}
            title={`${node.path} · ${relTime(node.note.mtimeMs)}`}
            style={{ paddingLeft: indent }}
            aria-label={node.name}
            className={[
              'relative flex h-7 w-full items-center gap-1.5 rounded pr-12 text-left text-sm',
              'transition-colors hover:bg-muted/40',
              isSelected
                ? 'text-foreground before:absolute before:left-0 before:top-1/2 before:h-5 before:w-[2px] before:-translate-y-1/2 before:bg-primary'
                : 'text-foreground/85 hover:text-foreground',
            ].join(' ')}
          >
            <FileText className="size-3.5 shrink-0 text-muted-foreground/60" />
            <span className="truncate">{label}</span>
          </button>
          <div className="absolute right-1 top-1/2 hidden -translate-y-1/2 items-center gap-1 group-hover:flex">
            <button
              type="button"
              aria-label={`Rename ${node.name}`}
              onClick={() => props.onStartRename(node.path)}
              className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
            ><Pencil className="size-3" /></button>
            <button
              type="button"
              aria-label={`Delete ${node.name}`}
              onClick={() => props.onStartDelete(node)}
              className="rounded p-0.5 text-muted-foreground hover:bg-destructive/15 hover:text-destructive"
            ><Trash2 className="size-3" /></button>
          </div>
        </div>
      </li>
    );
  }

  if (node.kind === 'rename') {
    return (
      <li>
        <RenameRow
          indent={indent}
          initialDraft={node.initialDraft}
          onCommit={(d) => props.onCommitRename(node.path, d)}
          onCancel={props.onCancelRename}
        />
      </li>
    );
  }

  if (node.kind === 'new-item') {
    return (
      <li>
        <NewItemRow
          indent={indent}
          itemKind={node.itemKind}
          onCommit={(d) => props.onCommitCreate(node.parentPath, node.itemKind, d)}
          onCancel={props.onCancelCreate}
        />
      </li>
    );
  }

  // folder
  const folder = node;
  const isRenaming = props.renamingPath === folder.path;
  return (
    <li>
      <details open>
        <summary
          data-row
          onDragOver={(e) => {
            const types = Array.from(e.dataTransfer.types);
            if (types.includes('application/x-sanji-path')) e.preventDefault();
          }}
          onDrop={(e) => {
            const raw = e.dataTransfer.getData('application/x-sanji-path');
            if (!raw) return;
            const payload = JSON.parse(raw) as DragPayload;
            if (payload.kind === 'folder' && (payload.path === folder.path || folder.path.startsWith(`${payload.path}/`))) return;
            props.onDropOnFolder(payload, folder);
          }}
          style={{ paddingLeft: indent }}
          className="group relative flex h-7 cursor-pointer select-none items-center gap-1 rounded pr-12 text-sm text-muted-foreground transition-colors hover:bg-muted/30 hover:text-foreground [&::-webkit-details-marker]:hidden"
          draggable={!folder.ephemeral}
          onDragStart={(e) => {
            if (folder.ephemeral) return;
            e.dataTransfer.setData(
              'application/x-sanji-path',
              JSON.stringify({ kind: 'folder', path: folder.path }),
            );
            e.dataTransfer.effectAllowed = 'move';
          }}
        >
          <ChevronRight className="size-3.5 shrink-0 transition-transform" />
          {isRenaming ? (
            <RenameRow
              indent={0}
              initialDraft={folder.name}
              onCommit={(d) => props.onCommitRename(folder.path, d)}
              onCancel={props.onCancelRename}
            />
          ) : (
            <>
              <span className={`truncate font-medium ${folder.ephemeral ? 'italic' : ''}`}>{folder.name}</span>
              {folder.ephemeral && (
                <span className="ml-1 rounded bg-muted px-1 text-[10px] uppercase text-muted-foreground/70">unsaved</span>
              )}
              <div className="absolute right-1 top-1/2 hidden -translate-y-1/2 items-center gap-1 group-hover:flex">
                <button
                  type="button"
                  aria-label={`Add inside ${folder.name}`}
                  onClick={(e) => { e.preventDefault(); setPickerOpen((v) => !v); }}
                  className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                ><Plus className="size-3" /></button>
                <button
                  type="button"
                  aria-label={`Rename ${folder.name}`}
                  onClick={(e) => { e.preventDefault(); props.onStartRename(folder.path); }}
                  className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                ><Pencil className="size-3" /></button>
                <button
                  type="button"
                  aria-label={`Delete ${folder.name}`}
                  onClick={(e) => { e.preventDefault(); props.onStartDelete(folder); }}
                  className="rounded p-0.5 text-muted-foreground hover:bg-destructive/15 hover:text-destructive"
                ><Trash2 className="size-3" /></button>
              </div>
              {pickerOpen && (
                <div className="absolute right-1 top-7 z-10 min-w-[140px] rounded border border-border bg-popover py-1 text-sm shadow-md">
                  <button
                    type="button"
                    onClick={(e) => { e.preventDefault(); setPickerOpen(false); props.onStartCreate(folder.path, 'note'); }}
                    className="block w-full px-3 py-1 text-left hover:bg-muted"
                  >New note here</button>
                  <button
                    type="button"
                    onClick={(e) => { e.preventDefault(); setPickerOpen(false); props.onStartCreate(folder.path, 'folder'); }}
                    className="block w-full px-3 py-1 text-left hover:bg-muted"
                  >New folder here</button>
                </div>
              )}
            </>
          )}
        </summary>
        <ul>
          {folder.children.map((c) => (
            <TreeRow
              key={rowKey(c)}
              {...props}
              node={c}
              depth={depth + 1}
            />
          ))}
          {props.newItemAtParent && props.newItemAtParent.parentPath === folder.path && (
            <TreeRow
              {...props}
              node={{
                kind: 'new-item',
                parentPath: folder.path,
                itemKind: props.newItemAtParent.itemKind,
              }}
              depth={depth + 1}
            />
          )}
        </ul>
      </details>
    </li>
  );
}
