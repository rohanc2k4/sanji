import { writeFile, mkdir, rename } from 'node:fs/promises';
import { existsSync, statSync } from 'node:fs';
import { join, basename, extname } from 'node:path';
import type { ProviderAdapter, IngestEvent, FileFormat, NoteFrontmatter } from '@sanji/shared';
import type { Skill } from '../skills/parse.js';
import type { VaultPaths } from '../config/paths.js';
import type { Indexer } from '../index/indexer.js';
import type { IndexRepo } from '../index/repo.js';
import { detectFormat, extractByFormat } from './extractors/index.js';
import { rewrite } from './rewrite.js';
import { buildVaultContext, type VaultContext } from './context.js';
import { parseNote } from '../vault/parse.js';
import { validateVaultRelativePath } from '../tools/validation.js';

export interface IngestServiceDeps {
  paths: VaultPaths;
  repo: IndexRepo;
  adapter: ProviderAdapter;
  model: string;
  ingestSkill: Skill;
  /**
   * Optional indexer. When provided, the service runs `indexer.indexFile`
   * on the just-written inbox note so chunks + embeddings land synchronously
   * — semantic_search / hybrid_search see the new content immediately
   * instead of waiting for the next full-vault re-index. Tests that don't
   * care about chunk indexing can omit this dep.
   */
  indexer?: Indexer;
}

export interface IngestJob {
  fileId: string;
  source:
    | { kind: 'file'; data: Buffer; filename: string }
    | { kind: 'paste'; title: string; content: string; format_hint?: string };
  abortController: AbortController;
}

const VAULT_CONTEXT_TTL_MS = 60_000;

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function kebab(s: string): string {
  return (s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80) || 'untitled');
}

function targetPathFor(source: IngestJob['source']): string {
  if (source.kind === 'file') {
    const stem = basename(source.filename, extname(source.filename));
    return `inbox/${stem}.md`;
  }
  return `inbox/${kebab(source.title)}.md`;
}

function sourceName(source: IngestJob['source']): string {
  return source.kind === 'file' ? source.filename : source.title;
}

/**
 * Build the vault-relative path for an original-source archive entry.
 *
 * `source.filename` arrives from a multipart upload and is client-controlled,
 * so we strip any directory components with `basename` before composing the
 * archive path. The composed path is then run through
 * `validateVaultRelativePath` to defend against any residual surprises (empty
 * basename, traversal segments smuggled through encoding, etc.). Returns null
 * when the basename is empty after sanitization — caller surfaces an error.
 */
function originalRelPath(source: IngestJob['source']): string | null {
  if (source.kind === 'file') {
    const safe = basename(source.filename);
    if (!safe || safe === '.' || safe === '..') return null;
    // Append a timestamp suffix so two ingestions of the same filename do not
    // overwrite each other in the originals archive. Combined with the
    // exclusive-create write flag at the call site, this is collision-resistant.
    const stem = basename(safe, extname(safe));
    const ext = extname(safe);
    const stamped = `${stem}-${Date.now()}${ext}`;
    const rel = `.sanji/originals/${stamped}`;
    try {
      return validateVaultRelativePath(rel);
    } catch {
      return null;
    }
  }
  const rel = `.sanji/originals/${kebab(source.title)}-${Date.now()}.txt`;
  try {
    return validateVaultRelativePath(rel);
  } catch {
    return null;
  }
}

function serializeFrontmatter(fm: Record<string, unknown>): string {
  const lines: string[] = [];
  for (const [k, v] of Object.entries(fm)) {
    if (v === undefined || v === null) continue;
    if (Array.isArray(v)) {
      lines.push(`${k}: [${v.map((x) => JSON.stringify(x)).join(', ')}]`);
    } else if (typeof v === 'string') {
      const needsQuote = /[:#\n]/.test(v);
      lines.push(`${k}: ${needsQuote ? JSON.stringify(v) : v}`);
    } else {
      lines.push(`${k}: ${v}`);
    }
  }
  return `${lines.join('\n')}\n`;
}

export class IngestService {
  private contextCache: { ctx: VaultContext; at: number } | null = null;
  private active: IngestJob | null = null;
  private readonly cancelled = new Set<string>();

  constructor(private readonly deps: IngestServiceDeps) {}

  invalidateContextCache() {
    this.contextCache = null;
  }

  cancel(fileId: string): void {
    this.cancelled.add(fileId);
    if (this.active?.fileId === fileId) {
      this.active.abortController.abort();
    }
  }

  private async getContext(): Promise<VaultContext> {
    const now = Date.now();
    if (this.contextCache && now - this.contextCache.at < VAULT_CONTEXT_TTL_MS) {
      return this.contextCache.ctx;
    }
    const ctx = await buildVaultContext(this.deps.repo);
    this.contextCache = { ctx, at: now };
    return ctx;
  }

  async *enqueue(job: IngestJob): AsyncGenerator<IngestEvent> {
    yield { kind: 'queued', fileId: job.fileId, sourceName: sourceName(job.source) };

    // Sequential gate: wait until any active job finishes.
    while (this.active && this.active.fileId !== job.fileId) {
      await new Promise((r) => setTimeout(r, 50));
    }

    if (this.cancelled.has(job.fileId)) {
      yield {
        kind: 'error', fileId: job.fileId, sourceName: sourceName(job.source),
        phase: 'extract', message: 'Cancelled by user.',
      };
      return;
    }

    this.active = job;
    try {
      yield* this.process(job);
    } finally {
      this.active = null;
    }
  }

  private async *process(job: IngestJob): AsyncGenerator<IngestEvent> {
    const name = sourceName(job.source);
    const target = targetPathFor(job.source);
    const targetAbs = join(this.deps.paths.vault, target);

    if (existsSync(targetAbs)) {
      yield {
        kind: 'skipped', fileId: job.fileId, sourceName: name,
        existingPath: target,
      };
      return;
    }

    yield { kind: 'extracting', fileId: job.fileId, sourceName: name };

    let format: FileFormat;
    let text: string;
    let pages: number | undefined;
    let warnings: string[];
    let originalForFrontmatter = '';

    try {
      if (job.source.kind === 'paste') {
        format = 'paste';
        const r = await extractByFormat('paste', job.source.content, name);
        text = r.text;
        warnings = r.warnings;
        const origRel = originalRelPath(job.source);
        if (!origRel) {
          yield {
            kind: 'error', fileId: job.fileId, sourceName: name,
            phase: 'extract', message: `Invalid filename: ${name}.`,
          };
          return;
        }
        const origAbs = join(this.deps.paths.vault, origRel);
        await mkdir(join(this.deps.paths.vault, '.sanji/originals'), { recursive: true });
        await writeFile(origAbs, job.source.content, { encoding: 'utf-8', flag: 'wx' });
        originalForFrontmatter = origRel;
      } else {
        format = detectFormat(job.source.filename);
        const r = await extractByFormat(format, job.source.data, job.source.filename);
        text = r.text;
        pages = r.pages;
        warnings = r.warnings;
        const origRel = originalRelPath(job.source);
        if (!origRel) {
          yield {
            kind: 'error', fileId: job.fileId, sourceName: name,
            phase: 'extract', message: `Invalid filename: ${name}.`,
          };
          return;
        }
        const origAbs = join(this.deps.paths.vault, origRel);
        await mkdir(join(this.deps.paths.vault, '.sanji/originals'), { recursive: true });
        await writeFile(origAbs, job.source.data, { flag: 'wx' });
        originalForFrontmatter = origRel;
      }
    } catch (err) {
      yield {
        kind: 'error', fileId: job.fileId, sourceName: name,
        phase: 'extract', message: `Could not read ${name}: ${(err as Error).message}.`,
      };
      return;
    }

    if (text.trim().length === 0) {
      const reason = warnings.find((w) => w.toLowerCase().includes('scanned'))
        ? `${name} appears scanned (no extractable text). OCR support is coming in v0.3.`
        : `${name} produced no extractable text.`;
      yield {
        kind: 'error', fileId: job.fileId, sourceName: name,
        phase: 'extract', message: reason,
      };
      return;
    }

    yield { kind: 'rewriting', fileId: job.fileId, sourceName: name };

    let result: Awaited<ReturnType<typeof rewrite>>;
    try {
      const ctx = await this.getContext();
      result = await rewrite(
        {
          extracted: { text, pages, warnings },
          filename: name,
          format,
          context: ctx,
          abortSignal: job.abortController.signal,
        },
        {
          adapter: this.deps.adapter,
          model: this.deps.model,
          ingestSkill: this.deps.ingestSkill,
        },
      );
    } catch (err) {
      const cancelled = job.abortController.signal.aborted;
      // Surface the raw model output to backend stderr when the parser
      // rejected it, so we can inspect what the LLM actually produced.
      const rawOutput = (err as Error & { rawOutput?: string }).rawOutput;
      if (!cancelled && typeof rawOutput === 'string') {
        process.stderr.write(
          `ingest rewrite parse failure for ${name}, raw model output:\n` +
            `<<<\n${rawOutput}\n>>>\n`,
        );
      }
      yield {
        kind: 'error', fileId: job.fileId, sourceName: name,
        phase: 'rewrite',
        message: cancelled
          ? 'Cancelled by user.'
          : `Rewrite failed for ${name}: ${(err as Error).message}.`,
      };
      return;
    }

    yield { kind: 'writing', fileId: job.fileId, sourceName: name };

    // Backend fills `source` + `ingested_on` + `original_format` + `pages`
    // regardless of what the model produced. The model only contributes
    // `title`, `summary`, optional `content_type`, optional `tags` —
    // everything else is authoritative on the backend side.
    const fm: NoteFrontmatter = {
      ...result.frontmatter,
      source: originalForFrontmatter,
      ingested_on: todayISO(),
      original_format: format,
      ...(pages !== undefined ? { pages } : {}),
    };
    const composed = `---\n${serializeFrontmatter(fm as unknown as Record<string, unknown>)}---\n\n${result.body.trimStart()}\n`;

    try {
      await mkdir(join(this.deps.paths.vault, 'inbox'), { recursive: true });
      const tmp = `${targetAbs}.tmp`;
      await writeFile(tmp, composed, 'utf-8');
      await rename(tmp, targetAbs);
    } catch (err) {
      yield {
        kind: 'error', fileId: job.fileId, sourceName: name,
        phase: 'write', message: `Could not write inbox/${target}: ${(err as Error).message}.`,
      };
      return;
    }

    // When an indexer is wired in, prefer the full path: indexer.indexFile
    // upserts the notes row AND chunks + embeddings, so semantic_search and
    // hybrid_search see the new content immediately. When the indexer is
    // absent (tests, degraded boots), fall back to a notes-row-only upsert
    // so the SourcesSidebar listing still picks the file up; the chokidar
    // watcher reconciles chunks asynchronously.
    if (this.deps.indexer) {
      try {
        await this.deps.indexer.indexFile(this.deps.paths.vault, target);
      } catch (err) {
        process.stderr.write(
          `post-ingest indexFile failed for ${target}: ${
            err instanceof Error ? err.message : String(err)
          }\n`,
        );
      }
    } else {
      try {
        const mtimeMs = statSync(targetAbs).mtimeMs;
        const parsed = parseNote(target, composed, mtimeMs);
        this.deps.repo.upsertNote(parsed.note);
      } catch {
        // Non-fatal: watcher will eventually pick the file up.
      }
    }

    this.invalidateContextCache();

    yield {
      kind: 'done', fileId: job.fileId, sourceName: name,
      outputPath: target,
      tokensInput: result.tokensUsed?.input ?? 0,
      tokensOutput: result.tokensUsed?.output ?? 0,
    };
  }
}
