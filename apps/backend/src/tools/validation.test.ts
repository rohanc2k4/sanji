import { describe, expect, it } from 'vitest';
import { validateVaultRelativePath } from './validation.js';

describe('validateVaultRelativePath', () => {
  it('returns a valid relative path unchanged', () => {
    expect(validateVaultRelativePath('notes/foo.md')).toBe('notes/foo.md');
  });

  it('accepts a file with .sanji in its name (not the first segment)', () => {
    expect(validateVaultRelativePath('foo.sanji.md')).toBe('foo.sanji.md');
  });

  it('accepts a nested path whose non-root segment contains .sanji', () => {
    expect(validateVaultRelativePath('notes/.sanjikeep')).toBe('notes/.sanjikeep');
  });

  it('throws for a non-string input', () => {
    expect(() => validateVaultRelativePath(42)).toThrow("'path' must be a string");
  });

  it('throws for an empty string', () => {
    expect(() => validateVaultRelativePath('')).toThrow("'path' must not be empty");
  });

  it('throws for an absolute path', () => {
    expect(() => validateVaultRelativePath('/etc/passwd')).toThrow(
      "'path' must be relative to the vault root",
    );
  });

  it('throws for a path with .. traversal', () => {
    expect(() => validateVaultRelativePath('../secret')).toThrow(
      "'path' must not contain traversal segments ('..')",
    );
  });

  it('throws for a path whose first segment is exactly .sanji', () => {
    expect(() => validateVaultRelativePath('.sanji/config.toml')).toThrow(
      "'path' must not point inside the .sanji/ directory",
    );
  });

  it('throws for the bare .sanji segment', () => {
    expect(() => validateVaultRelativePath('.sanji')).toThrow(
      "'path' must not point inside the .sanji/ directory",
    );
  });

  it('throws for a deeply nested .sanji/ path', () => {
    expect(() => validateVaultRelativePath('.sanji/trash/x')).toThrow(
      "'path' must not point inside the .sanji/ directory",
    );
  });
});
