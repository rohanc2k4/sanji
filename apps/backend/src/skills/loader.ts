import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { type Skill, parseSkill } from './parse.js';
import type { VaultPaths } from '../config/paths.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const BUILTIN_DIR = join(HERE, 'builtin');

export interface LoadResult {
  skills: Skill[];
  errors: Array<{ source: string; message: string }>;
}

export async function loadSkills(paths: VaultPaths): Promise<LoadResult> {
  const errors: Array<{ source: string; message: string }> = [];
  const byTrigger = new Map<string, Skill>();

  if (existsSync(BUILTIN_DIR)) {
    for (const file of mdFiles(BUILTIN_DIR)) {
      tryLoad(file, byTrigger, errors);
    }
  }

  if (existsSync(paths.skillsDir)) {
    for (const file of mdFiles(paths.skillsDir)) {
      tryLoad(file, byTrigger, errors);
    }
  }

  return { skills: Array.from(byTrigger.values()), errors };
}

function mdFiles(dir: string): string[] {
  return readdirSync(dir)
    .filter((f) => f.endsWith('.md'))
    .sort()
    .map((f) => join(dir, f));
}

function tryLoad(
  file: string,
  byTrigger: Map<string, Skill>,
  errors: Array<{ source: string; message: string }>,
): void {
  try {
    const raw = readFileSync(file, 'utf8');
    const skill = parseSkill(file, raw);
    byTrigger.set(skill.trigger, skill);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    errors.push({ source: file, message });
  }
}
