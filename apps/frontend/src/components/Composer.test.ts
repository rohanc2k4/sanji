import { describe, expect, it } from 'vitest';
import { isClearCommand } from './Composer';

describe('isClearCommand', () => {
  it('matches plain /clear', () => {
    expect(isClearCommand('/clear')).toBe(true);
  });

  it('matches /clear with surrounding whitespace', () => {
    expect(isClearCommand('  /clear ')).toBe(true);
    expect(isClearCommand('\t/clear\n')).toBe(true);
  });

  it('does not match /clear with extra args (v0.1 keeps the surface tight)', () => {
    expect(isClearCommand('/clear all')).toBe(false);
    expect(isClearCommand('/clear history')).toBe(false);
  });

  it('does not match prose mentions of /clear', () => {
    expect(isClearCommand('what does /clear do?')).toBe(false);
    expect(isClearCommand('use /clear to wipe')).toBe(false);
  });

  it('does not match other slash commands', () => {
    expect(isClearCommand('/ask hello')).toBe(false);
    expect(isClearCommand('/clearcache')).toBe(false);
  });
});
