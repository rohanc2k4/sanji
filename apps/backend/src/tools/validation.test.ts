import { describe, expect, it } from 'vitest';
import { validateVaultRelativePath, validateUserVaultPath } from './validation.js';

describe('validateVaultRelativePath', () => {
  it('accepts a normal relative path', () => {
    expect(validateVaultRelativePath('notes/foo.md')).toBe('notes/foo.md');
  });
  it('accepts .sanji/ paths (internal writers need this)', () => {
    expect(validateVaultRelativePath('.sanji/originals/x.pdf')).toBe('.sanji/originals/x.pdf');
  });
  it('throws on absolute', () => {
    expect(() => validateVaultRelativePath('/etc/passwd')).toThrow(/relative/);
  });
  it('throws on .. traversal', () => {
    expect(() => validateVaultRelativePath('../secret')).toThrow(/traversal/);
  });
});

describe('validateUserVaultPath', () => {
  it('accepts a normal relative path', () => {
    expect(validateUserVaultPath('notes/foo.md')).toBe('notes/foo.md');
  });
  it('accepts a file whose name merely contains .sanji', () => {
    expect(validateUserVaultPath('foo.sanji.md')).toBe('foo.sanji.md');
  });
  it('rejects the bare .sanji segment', () => {
    expect(() => validateUserVaultPath('.sanji')).toThrow(/\.sanji/);
  });
  it('rejects paths inside .sanji/', () => {
    expect(() => validateUserVaultPath('.sanji/config.toml')).toThrow(/\.sanji/);
  });
  it('still enforces the base checks (.. traversal)', () => {
    expect(() => validateUserVaultPath('../escape.md')).toThrow(/traversal/);
  });
});
