import { isAbsolute } from 'node:path';

/** Vault-relative path used for file I/O: rejects empty, absolute, and traversal segments. */
export function validateVaultRelativePath(input: unknown): string {
  if (typeof input !== 'string') throw new Error("'path' must be a string");
  if (!input.length) throw new Error("'path' must not be empty");
  if (isAbsolute(input)) throw new Error("'path' must be relative to the vault root");
  if (input.split(/[\\/]/).some((seg) => seg === '..')) {
    throw new Error("'path' must not contain traversal segments ('..')");
  }
  return input;
}

/**
 * Stricter check for caller-supplied paths on user-facing CRUD endpoints:
 * everything validateVaultRelativePath enforces, plus a refusal to touch the
 * .sanji/ control directory (config, index db, trash, originals, versions).
 * Internal writers (ingest originals, trash moves) keep using
 * validateVaultRelativePath directly so they can still write inside .sanji/.
 */
export function validateUserVaultPath(input: unknown): string {
  const validated = validateVaultRelativePath(input);
  if (validated.split(/[\\/]/)[0] === '.sanji') {
    throw new Error("'path' must not point inside the .sanji/ directory");
  }
  return validated;
}

/** Lighter check for tools that look up paths in the index but don't touch the filesystem. */
export function validateNonEmptyPath(input: unknown): string {
  if (typeof input !== 'string' || !input.length) {
    throw new Error("'path' must be a non-empty string");
  }
  return input;
}
