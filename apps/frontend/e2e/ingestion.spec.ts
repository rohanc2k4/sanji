import { test, expect } from '@playwright/test';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

let vault: string;

test.beforeEach(() => {
  vault = mkdtempSync(join(tmpdir(), 'sanji-ingest-e2e-'));
  mkdirSync(join(vault, 'daily'));
  writeFileSync(join(vault, 'daily/2026-05-06.md'), '---\ntitle: Today\n---\nbody');
});

test.afterEach(() => {
  rmSync(vault, { recursive: true, force: true });
});

async function walkOnboardingThroughIndexing(page: import('@playwright/test').Page) {
  await page.goto('/');

  // The backend persists kind:'ready' across tests (and across dev-server
  // reuses), so a fresh page.goto can land on either the onboarding wizard
  // or the ChatShell depending on prior state. Race both, branch on whichever
  // wins.
  const onboardingHeading = page.getByRole('heading', { name: /where does your vault live/i });
  const sourcesLabel = page.getByText(/^sources$/i);
  await Promise.any([
    onboardingHeading.waitFor({ state: 'visible', timeout: 15_000 }),
    sourcesLabel.waitFor({ state: 'visible', timeout: 15_000 }),
  ]);
  if (await sourcesLabel.isVisible()) return;

  await page.getByLabel(/vault path/i).fill(vault);
  await page.getByRole('button', { name: /^validate$/i }).click();
  await expect(page.getByText(/found 1 markdown note/i)).toBeVisible();
  await page.getByRole('button', { name: /^continue$/i }).click();

  await expect(page.getByRole('heading', { name: /which claude/i })).toBeVisible();
  await page.getByRole('button', { name: /claude code subscription/i }).click();
  await expect(page.getByText(/credentials look good/i)).toBeVisible({ timeout: 30_000 });
  await page.getByRole('button', { name: /^continue$/i }).click();

  await expect(page.getByRole('heading', { name: /indexing your notes/i })).toBeVisible();
  await page.getByRole('button', { name: /start indexing/i }).click();
  await expect(page.getByText(/indexed 1 note/i)).toBeVisible({ timeout: 30_000 });
  await page.getByRole('button', { name: /^continue$/i }).click();

  await expect(page.getByRole('heading', { name: /you're set/i })).toBeVisible();
  await page.getByRole('button', { name: /open sanji/i }).click();
  await expect(page.locator('header').getByText(/sanji/i).first()).toBeVisible();
  await expect(page.getByText(/^sources$/i)).toBeVisible();
}

test('drag a txt file into the chat pane → ingestion completes → done row references inbox path', async ({
  page,
}) => {
  await walkOnboardingThroughIndexing(page);

  // Playwright cannot do a real OS-level drag-drop of files into a webpage,
  // so we synthesize a DataTransfer with a File and dispatch the drag events
  // directly on the ChatPane wrapper that owns the drop handlers. Events
  // bubble up, not down, so dispatching on <main> would miss the inner div.
  const chatPane = page.locator('[data-testid="chat-pane"]');
  await chatPane.evaluate(async (el) => {
    const dt = new DataTransfer();
    const fileBlob = new File(
      ['A short note for the ingestion E2E.\n\nIt has two paragraphs.'],
      'tiny.txt',
      { type: 'text/plain' },
    );
    dt.items.add(fileBlob);
    el.dispatchEvent(new DragEvent('dragenter', { bubbles: true, dataTransfer: dt }));
    el.dispatchEvent(new DragEvent('dragover', { bubbles: true, dataTransfer: dt }));
    el.dispatchEvent(new DragEvent('drop', { bubbles: true, dataTransfer: dt }));
  });

  // Status row appears in the IngestStatusPanel. The source-name span renders
  // the file's display name; assert visibility on the file's stem to dodge
  // any ambiguity with a phase label that also reads "tiny".
  await expect(page.getByText('tiny.txt').first()).toBeVisible({ timeout: 5_000 });

  // OfflineFakeAdapter (env SANJI_OFFLINE_FAKE_LLM=1, recognized by the
  // ingest skill's H1) returns canned frontmatter+body. The pipeline runs:
  // extracting → rewriting → writing → done in well under 30s on the fake.
  await expect(page.getByText(/saved to/i).first()).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText('inbox/tiny.md').first()).toBeVisible();
  await expect(
    page.getByText(/drag from the sources sidebar to organize/i).first(),
  ).toBeVisible();
});
