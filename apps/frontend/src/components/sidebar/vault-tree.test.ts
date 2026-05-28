import { describe, expect, it } from 'vitest';
import { buildTree } from './vault-tree';

describe('buildTree', () => {
  const note = (path: string) => ({ path, title: null, mtimeMs: 0 });

  it('returns an empty array when there are no notes and no ephemeral folders', () => {
    expect(buildTree([], new Set())).toEqual([]);
  });

  it('groups notes into folders sorted folders-first then alpha', () => {
    const tree = buildTree([note('z.md'), note('a/x.md'), note('a/y.md')], new Set());
    expect(tree).toHaveLength(2);
    expect(tree[0]).toMatchObject({ kind: 'folder', name: 'a' });
    expect(tree[1]).toMatchObject({ kind: 'note', name: 'z.md' });
  });

  it('injects ephemeral folders that do not collide with real ones', () => {
    const tree = buildTree([note('real/a.md')], new Set(['scratch', 'real']));
    const names = tree.map((n) => n.name);
    expect(names).toContain('real');
    expect(names).toContain('scratch');
    const real = tree.find((n) => n.name === 'real')!;
    expect(real).toMatchObject({ kind: 'folder', ephemeral: false });
    const scratch = tree.find((n) => n.name === 'scratch')!;
    expect(scratch).toMatchObject({ kind: 'folder', ephemeral: true });
  });

  it('drops ephemeral folders that collide with a real folder of the same path', () => {
    const tree = buildTree([note('real/a.md')], new Set(['real']));
    const real = tree.find((n) => n.name === 'real')!;
    expect(real).toMatchObject({ ephemeral: false });
    expect(tree.filter((n) => n.name === 'real')).toHaveLength(1);
  });

  it('supports nested ephemeral folders by path', () => {
    const tree = buildTree([note('parent/note.md')], new Set(['parent/child']));
    const parent = tree.find((n) => n.name === 'parent') as any;
    expect(parent.kind).toBe('folder');
    const child = parent.children.find((n: any) => n.name === 'child');
    expect(child).toMatchObject({ kind: 'folder', ephemeral: true });
  });
});
