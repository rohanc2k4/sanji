import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TreeRow } from './TreeRow';
import type { TreeNode } from './vault-tree';

const noteNode: TreeNode = {
  kind: 'note', name: 'a.md', path: 'a.md',
  note: { path: 'a.md', title: 'A', mtimeMs: 0 },
};
const folderNode: TreeNode = {
  kind: 'folder', name: 'inbox', path: 'inbox', children: [], ephemeral: false,
};
const ephemeralNode: TreeNode = {
  kind: 'folder', name: 'scratch', path: 'scratch', children: [], ephemeral: true,
};

const baseProps = {
  depth: 0,
  selectedPath: null,
  renamingPath: null,
  newItemAtParent: null,
  onSelect: vi.fn(),
  onStartRename: vi.fn(),
  onCommitRename: vi.fn(),
  onCancelRename: vi.fn(),
  onStartDelete: vi.fn(),
  onStartCreate: vi.fn(),
  onCommitCreate: vi.fn(),
  onCancelCreate: vi.fn(),
  onDropOnFolder: vi.fn(),
};

describe('TreeRow', () => {
  beforeEach(() => vi.clearAllMocks());

  it('note rows show ✎ and 🗑 hover icons', () => {
    render(<ul><TreeRow node={noteNode} {...baseProps} /></ul>);
    expect(screen.getByLabelText('Rename a.md')).toBeInTheDocument();
    expect(screen.getByLabelText('Delete a.md')).toBeInTheDocument();
  });

  it('folder rows show +, ✎, 🗑 hover icons', () => {
    render(<ul><TreeRow node={folderNode} {...baseProps} /></ul>);
    expect(screen.getByLabelText('Add inside inbox')).toBeInTheDocument();
    expect(screen.getByLabelText('Rename inbox')).toBeInTheDocument();
    expect(screen.getByLabelText('Delete inbox')).toBeInTheDocument();
  });

  it('folder + opens picker with New note here and New folder here', () => {
    render(<ul><TreeRow node={folderNode} {...baseProps} /></ul>);
    fireEvent.click(screen.getByLabelText('Add inside inbox'));
    expect(screen.getByText('New note here')).toBeInTheDocument();
    expect(screen.getByText('New folder here')).toBeInTheDocument();
  });

  it('ephemeral folders render with italic + unsaved badge', () => {
    render(<ul><TreeRow node={ephemeralNode} {...baseProps} /></ul>);
    expect(screen.getByText('unsaved')).toBeInTheDocument();
  });

  it('drag start sets dataTransfer payload for notes', () => {
    render(<ul><TreeRow node={noteNode} {...baseProps} /></ul>);
    const button = screen.getByRole('button', { name: 'a.md' });
    const setData = vi.fn();
    fireEvent.dragStart(button, { dataTransfer: { setData, effectAllowed: '' } });
    expect(setData).toHaveBeenCalledWith(
      'application/x-sanji-path',
      JSON.stringify({ kind: 'note', path: 'a.md' }),
    );
  });

  it('drop on folder calls onDropOnFolder with parsed payload', () => {
    render(<ul><TreeRow node={folderNode} {...baseProps} /></ul>);
    const summary = screen.getByText('inbox').closest('summary')!;
    const payload = JSON.stringify({ kind: 'note', path: 'cmsc416/x.md' });
    fireEvent.drop(summary, {
      dataTransfer: { getData: vi.fn().mockReturnValue(payload) },
    });
    expect(baseProps.onDropOnFolder).toHaveBeenCalledWith(
      { kind: 'note', path: 'cmsc416/x.md' },
      folderNode,
    );
  });

  it('drop of a folder onto itself does NOT call onDropOnFolder', () => {
    render(<ul><TreeRow node={folderNode} {...baseProps} /></ul>);
    const summary = screen.getByText('inbox').closest('summary')!;
    const selfPayload = JSON.stringify({ kind: 'folder', path: 'inbox' });
    fireEvent.drop(summary, { dataTransfer: { getData: vi.fn().mockReturnValue(selfPayload) } });
    expect(baseProps.onDropOnFolder).not.toHaveBeenCalled();
  });

  it('drop of an ancestor folder onto its descendant does NOT call onDropOnFolder', () => {
    const subFolder: TreeNode = { kind: 'folder', name: 'sub', path: 'inbox/sub', children: [], ephemeral: false };
    render(<ul><TreeRow node={subFolder} {...baseProps} /></ul>);
    const summary = screen.getByText('sub').closest('summary')!;
    const ancestorPayload = JSON.stringify({ kind: 'folder', path: 'inbox' });
    fireEvent.drop(summary, { dataTransfer: { getData: vi.fn().mockReturnValue(ancestorPayload) } });
    expect(baseProps.onDropOnFolder).not.toHaveBeenCalled();
  });

  it('folder dragstart sets the folder payload', () => {
    render(<ul><TreeRow node={folderNode} {...baseProps} /></ul>);
    const summary = screen.getByText('inbox').closest('summary')!;
    const setData = vi.fn();
    fireEvent.dragStart(summary, { dataTransfer: { setData, effectAllowed: '' } });
    expect(setData).toHaveBeenCalledWith(
      'application/x-sanji-path',
      JSON.stringify({ kind: 'folder', path: 'inbox' }),
    );
  });
});
