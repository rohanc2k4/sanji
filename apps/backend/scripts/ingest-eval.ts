/**
 * Manual eval runner for the ingest skill prompt. Walks every source file in
 * apps/backend/test/ingest-corpus/, runs it through the real rewrite pipeline
 * against a real Claude adapter (so this is intentionally NOT part of CI; it
 * burns API tokens or subscription quota), and grades the produced
 * frontmatter against the hand-written `<stem>.expected.md` companion. The
 * report lands in `outputs/ingest-eval-<YYYY-MM-DD>.md` so iteration history
 * stays in the EA repo.
 *
 * Usage:
 *   pnpm -F @sanji/backend ingest:eval <vault-path>
 *
 * <vault-path> is a real Sanji vault that the eval can boot against (its
 * `.sanji/config.toml` provides the provider mode and default model). The
 * sample-vault at the sanji repo root works as a sane default.
 */
import { readdirSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, basename, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse as parseYaml } from 'yaml';
import { bootstrapReadyDeps } from '../src/http/bootstrap.js';
import { detectFormat, extractByFormat } from '../src/ingest/extractors/index.js';
import { rewrite } from '../src/ingest/rewrite.js';
import { buildVaultContext } from '../src/ingest/context.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const CORPUS = join(__dirname, '..', 'test', 'ingest-corpus');
// Reports land in the EA repo's outputs/ so the eval history is versioned
// alongside other manual artifacts. Path is computed relative to the sanji
// repo root, then up one more level to ~/Dev_Projects/executive-assistant.
const REPORT_DIR = join(__dirname, '..', '..', '..', '..', 'executive-assistant', 'outputs');

interface FixtureResult {
  name: string;
  pass: boolean;
  details: string[];
}

async function main() {
  const sourceVault = process.argv[2];
  if (!sourceVault) {
    console.error('Usage: ingest:eval <vault-path>');
    console.error('Example: pnpm -F @sanji/backend ingest:eval ~/Dev_Projects/sanji/sample-vault');
    process.exit(1);
  }

  const deps = await bootstrapReadyDeps(sourceVault);
  const ingestSkill = deps.skills.find((s) => s.name === 'ingest');
  if (!ingestSkill) {
    console.error('bundled ingest skill not found in skills/');
    process.exit(1);
  }

  const sourceFiles = readdirSync(CORPUS).filter(
    (f) => !f.endsWith('.expected.md') && !f.startsWith('.') && f !== 'README.md',
  );
  if (sourceFiles.length === 0) {
    console.error(`no fixture sources found in ${CORPUS}`);
    console.error('see test/ingest-corpus/README.md for the curation guide');
    process.exit(1);
  }

  const results: FixtureResult[] = [];
  for (const file of sourceFiles) {
    const stem = basename(file, extname(file));
    const expectedPath = join(CORPUS, `${stem}.expected.md`);
    let expectedFm: Record<string, unknown> = {};
    try {
      expectedFm = parseExpected(readFileSync(expectedPath, 'utf-8'));
    } catch {
      results.push({
        name: stem,
        pass: false,
        details: [`missing or unreadable companion: ${stem}.expected.md`],
      });
      continue;
    }

    const format = detectFormat(file);
    const buf = readFileSync(join(CORPUS, file));
    const extracted = await extractByFormat(format, buf, file);
    const ctx = await buildVaultContext(deps.repo);
    let rewriteResult: Awaited<ReturnType<typeof rewrite>>;
    try {
      rewriteResult = await rewrite(
        { extracted, filename: file, format, context: ctx },
        { adapter: deps.adapter, model: deps.cfg.models.default, ingestSkill },
      );
    } catch (err) {
      results.push({
        name: stem,
        pass: false,
        details: [`rewrite threw: ${(err as Error).message}`],
      });
      continue;
    }

    const failures = compareFrontmatter(rewriteResult.frontmatter, expectedFm);
    results.push({ name: stem, pass: failures.length === 0, details: failures });
    process.stdout.write(failures.length === 0 ? '.' : 'x');
  }
  process.stdout.write('\n');

  mkdirSync(REPORT_DIR, { recursive: true });
  const today = new Date().toISOString().slice(0, 10);
  const reportPath = join(REPORT_DIR, `ingest-eval-${today}.md`);
  writeFileSync(reportPath, renderReport(results), 'utf-8');
  console.log(`wrote ${reportPath}`);

  const passed = results.filter((r) => r.pass).length;
  const pct = (passed / results.length) * 100;
  console.log(`pass rate: ${passed}/${results.length} (${pct.toFixed(0)}%)`);
}

function parseExpected(raw: string): Record<string, unknown> {
  const m = raw.match(/^---\s*\n([\s\S]*?)\n---/);
  if (!m) return {};
  return (parseYaml(m[1]!) as Record<string, unknown>) ?? {};
}

function compareFrontmatter(
  actual: Record<string, unknown>,
  expected: Record<string, unknown>,
): string[] {
  const out: string[] = [];
  if (typeof expected.content_type === 'string' && expected.content_type !== actual.content_type) {
    out.push(
      `content_type: expected '${String(expected.content_type)}', got '${String(actual.content_type)}'`,
    );
  }
  if (
    typeof expected.title_contains === 'string' &&
    !String(actual.title ?? '').toLowerCase().includes(expected.title_contains.toLowerCase())
  ) {
    out.push(
      `title should contain '${expected.title_contains}', got '${String(actual.title)}'`,
    );
  }
  const sum = String(actual.summary ?? '');
  if (typeof expected.summary === 'string') {
    if (sum.length > 200) out.push(`summary too long: ${sum.length} chars (expected ≤200)`);
    if (sum.length < 20) out.push(`summary too short: ${sum.length} chars (expected ≥20)`);
  }
  if (Array.isArray(expected.tags_min) && Array.isArray(actual.tags)) {
    const min = expected.tags_min.length;
    if ((actual.tags as unknown[]).length < min) {
      out.push(`tags: expected ≥${min}, got ${(actual.tags as unknown[]).length}`);
    }
  }
  return out;
}

function renderReport(results: FixtureResult[]): string {
  const passed = results.filter((r) => r.pass).length;
  const total = results.length;
  const pct = total > 0 ? ((passed / total) * 100).toFixed(0) : '0';
  return [
    `# Ingestion eval — ${new Date().toISOString()}`,
    '',
    `**${passed} / ${total} passed (${pct}%)**`,
    '',
    ...results.flatMap((r) => [
      `## ${r.name} ${r.pass ? '✓' : '✗'}`,
      r.details.length === 0 ? '(all checks passed)' : r.details.map((d) => `- ${d}`).join('\n'),
      '',
    ]),
  ].join('\n');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
