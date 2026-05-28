import { isAbsolute } from 'node:path';

/** Vault-relative path used for file I/O: rejects empty, absolute, and traversal segments. */
export function validateVaultRelativePath(input: unknown): string {
  if (typeof input !== 'string') throw new Error("'path' must be a string");
  if (!input.length) throw new Error("'path' must not be empty");
  if (isAbsolute(input)) throw new Error("'path' must be relative to the vault root");
  if (input.split(/[\\/]/).some((seg) => seg === '..')) {
    throw new Error("'path' must not contain traversal segments ('..')");
  }
  if (input.split(/[\\/]/)[0] === '.sanji') {
    throw new Error("'path' must not point inside the .sanji/ directory");
  }
  return input;
}

/** Lighter check for tools that look up paths in the index but don't touch the filesystem. */
export function validateNonEmptyPath(input: unknown): string {
  if (typeof input !== 'string' || !input.length) {
    throw new Error("'path' must be a non-empty string");
  }
  return input;
}
