import { test, expect } from '@playwright/test';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

let vault: string;
// True only when THIS spec's run performed onboarding and we know which vault
// the backend is pointed at. If the backend was already kind:'ready' from a
// prior spec (onboarding or ingestion), we skip disk assertions and rely on
// UI assertions only.
let onboardedHere = false;

test.beforeEach(() => {
  vault = mkdtempSync(join(tmpdir(), 'sanji-sidebar-e2e-'));
  mkdirSync(join(vault, 'cmsc416'), { recursive: true });
  writeFileSync(join(vault, 'cmsc416/hmm.md'), '---\ntitle: HMM\n---\nbody');
  onboardedHere = false;
});

test.afterEach(() => {
  rmSync(vault, { recursive: true, force: true });
});

async function walkOnboardingThroughIndexing(page: import('@playwright/test').Page) {
  await page.goto('/');

  // The backend persists kind:'ready' across specs (workers:1, shared process).
  // A fresh page.goto can land on either the onboarding wizard or ChatShell.
  // Race both and branch on whichever resolves first.
  const onboardingHeading = page.getByRole('heading', { name: /where does your vault live/i });
  const sourcesLabel = page.getByText(/^sources$/i);
  await Promise.any([
    onboardingHeading.waitFor({ state: 'visible', timeout: 15_000 }),
    sourcesLabel.waitFor({ state: 'visible', timeout: 15_000 }),
  ]);

  // Already on ChatShell — backend was flipped by a prior spec. Disk assertions
  // would target the WRONG vault, so disable them for this run.
  if (await sourcesLabel.isVisible()) {
    onboardedHere = false;
    return;
  }

  // ---- Vault step ----
  await page.getByLabel(/vault path/i).fill(vault);
  await page.getByRole('button', { name: /^validate$/i }).click();
  await expect(page.getByText(/found 1 markdown note/i)).toBeVisible();
  await page.getByRole('button', { name: /^continue$/i }).click();

  // ---- Provider step ----
  await expect(page.getByRole('heading', { name: /which claude/i })).toBeVisible();
  await page.getByRole('button', { name: /claude code subscription/i }).click();
  await expect(page.getByText(/credentials look good/i)).toBeVisible({ timeout: 30_000 });
  await page.getByRole('button', { name: /^continue$/i }).click();

  // ---- Indexing step ----
  await expect(page.getByRole('heading', { name: /indexing your notes/i })).toBeVisible();
  await page.getByRole('button', { name: /start indexing/i }).click();
  await expect(page.getByText(/indexed 1 note/i)).toBeVisible({ timeout: 30_000 });
  await page.getByRole('button', { name: /^continue$/i }).click();

  // ---- Done step ----
  await expect(page.getByRole('heading', { name: /you're set/i })).toBeVisible();
  await page.getByRole('button', { name: /open sanji/i }).click();

  // ---- Chat shell ----
  await expect(page.locator('header').getByText(/sanji/i).first()).toBeVisible();
  await expect(page.getByText(/^sources$/i)).toBeVisible();

  // Mark that we own the active vault, so disk assertions below are valid.
  onboardedHere = true;
}

test('sidebar CRUD golden path', async ({ page }) => {
  await walkOnboardingThroughIndexing(page);

  // ---- 1. Create folder "scratch" via footer Folder button ----
  // The footer button lives inside the sidebar. Use the sidebar aside element
  // as a scope to avoid clashing with any other "Folder" text on the page.
  const sidebar = page.locator('aside');
  await sidebar.getByRole('button', { name: /^folder$/i }).click();
  const folderInput = page.getByPlaceholder('folder name');
  // Wait for the input to appear before filling — click is async in React.
  await expect(folderInput).toBeVisible({ timeout: 5_000 });
  await folderInput.fill('scratch');
  await folderInput.press('Enter');
  // Ephemeral folder appears with the "unsaved" chip (not yet on disk).
  // Give React a moment to flush the batched state updates.
  await expect(page.getByText('scratch')).toBeVisible({ timeout: 5_000 });
  await expect(page.getByText('unsaved')).toBeVisible();

  // ---- 2. Create note "todo" inside scratch via folder picker ----
  // Hover the scratch row to reveal the "Add inside scratch" icon button, then
  // click it and choose "New note here" from the picker dropdown.
  await page.getByText('scratch').hover();
  await page.getByLabel('Add inside scratch').click();
  await page.getByText('New note here').click();

  const noteInput = page.getByPlaceholder('note name');
  await noteInput.fill('todo');
  await noteInput.press('Enter');

  // The new note row should appear in the tree as a sidebar button labeled "todo.md".
  // The label shown in the TreeRow strips the .md extension, but the aria-label
  // on the button is node.name which includes it.
  const todoBtn = page.getByRole('button', { name: 'todo.md', exact: true });
  await expect(todoBtn).toBeVisible({ timeout: 10_000 });

  // Creating the first note inside an ephemeral folder materializes both the
  // folder AND the note on disk. The "unsaved" chip should disappear once the
  // API responds and the sidebar reloads.
  await expect(page.getByText('unsaved')).toHaveCount(0, { timeout: 10_000 });

  // Disk check: only meaningful when we performed onboarding and know the vault.
  if (onboardedHere) {
    await expect
      .poll(() => existsSync(join(vault, 'scratch/todo.md')), { timeout: 5_000 })
      .toBe(true);
  }

  // ---- 3. Drag todo into cmsc416 (descoped per DnD guidance) ----
  //
  // The sidebar uses HTML5 draggable + dragstart/drop events (not pointer-based
  // DnD). Playwright's locator.dragTo() dispatches HTML5 drag events, but
  // headless Chromium native DnD is notoriously unreliable. Attempts to
  // synthesize the drag via page.evaluate also hang when the backend API call
  // fires inline on the drop handler in headless context.
  //
  // Move-via-DnD is fully covered by TreeRow.test.tsx unit tests, which fire
  // the same dragstart + drop events in a jsdom harness and assert the
  // onDropOnFolder callback is called with the correct payload. The E2E
  // intentionally skips this step to avoid flakiness.
  //
  // (Descoped — see DnD guidance in T17 task spec.)

  // ---- 4. Delete todo via hover trash icon → AlertDialog confirm ----
  // todo may have moved to cmsc416 or may still be in scratch. Either way,
  // hover the sidebar button for the note and click the Delete icon.
  const todoSidebarBtn = page.getByRole('button', { name: 'todo.md', exact: true });
  await todoSidebarBtn.hover();
  // The delete button aria-label is "Delete todo.md" (node.name includes .md).
  await page.getByLabel(/Delete todo\.md/i).click();
  await page.getByRole('button', { name: /move to trash/i }).click();

  // The sidebar button for the note should disappear.
  await expect(page.getByRole('button', { name: 'todo.md', exact: true })).toHaveCount(0, { timeout: 10_000 });

  // ---- 5. Reload + assert persistence ----
  // After reload: cmsc416 should still be present, todo should be gone, and
  // there should be no stray "unsaved" chips (all ephemeral state was resolved).
  await page.reload();
  await expect(page.getByText(/^sources$/i)).toBeVisible({ timeout: 15_000 });
  // The deleted note button must not appear anywhere in the sidebar after reload.
  // This is a universal assertion regardless of which vault the backend points at.
  await expect(page.getByRole('button', { name: 'todo.md', exact: true })).toHaveCount(0);
  // No lingering "unsaved" ephemeral chips — all ephemeral state was resolved before reload.
  await expect(page.getByText('unsaved')).toHaveCount(0);
  // When this spec ran its own onboarding, cmsc416 should still be present (it
  // wasn't deleted, only todo.md was). When the backend was already ready from
  // a prior spec, cmsc416 is only in OUR temp vault which the backend doesn't
  // know about — skip this assertion.
  if (onboardedHere) {
    await expect(page.getByText('cmsc416')).toBeVisible();
  }
});
