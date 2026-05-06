import { test, expect } from '@playwright/test';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

let vault: string;

test.beforeEach(() => {
  // Fresh vault per test so the post-init swap doesn't leak ready-deps across
  // cases. Each test boots through onboarding in its own tmp dir.
  vault = mkdtempSync(join(tmpdir(), 'sanji-e2e-'));
  mkdirSync(join(vault, 'daily'));
  writeFileSync(
    join(vault, 'daily/2026-04-27.md'),
    '---\ntitle: Today\n---\nargocd notes here',
  );
});

test.afterEach(() => {
  rmSync(vault, { recursive: true, force: true });
});

async function walkOnboardingThroughIndexing(page: import('@playwright/test').Page) {
  await page.goto('/');

  await expect(page.getByRole('heading', { name: /where does your vault live/i })).toBeVisible({
    timeout: 15_000,
  });

  // ---- Vault step ----
  await page.getByLabel(/vault path/i).fill(vault);
  await page.getByRole('button', { name: /^validate$/i }).click();
  await expect(page.getByText(/found 1 markdown note/i)).toBeVisible();
  await page.getByRole('button', { name: /^continue$/i }).click();

  // ---- Provider step ----
  await expect(page.getByRole('heading', { name: /which claude/i })).toBeVisible();
  await page.getByRole('button', { name: /claude code subscription/i }).click();
  // The webServer env sets SANJI_OFFLINE_FAKE_LLM=1 so testCredentials() returns
  // ok without needing real Claude auth.
  await expect(page.getByText(/credentials look good/i)).toBeVisible({ timeout: 30_000 });
  await page.getByRole('button', { name: /^continue$/i }).click();

  // ---- Model step (recommended preselected) ----
  await expect(page.getByRole('heading', { name: /default model/i })).toBeVisible();
  await page.getByRole('button', { name: /^continue$/i }).click();

  // ---- Calendar (skip) ----
  await expect(page.getByRole('heading', { name: /add a calendar/i })).toBeVisible();
  await page.getByRole('button', { name: /^continue$/i }).click();

  // ---- Tavily (skip) ----
  await expect(page.getByRole('heading', { name: /tavily/i })).toBeVisible();
  await page.getByRole('button', { name: /^continue$/i }).click();

  // ---- Indexing step ----
  // Clicking "Start indexing" fires initOnboarding which writes the config
  // and bootstraps the kind:'ready' deps via the runtime swap in
  // apps/backend/src/http/server.ts. The SSE then opens against the live
  // /api/indexing/status route and streams progress events; FakeEmbedder
  // makes per-note indexing fast so the 1-note fixture finishes in ms.
  await expect(page.getByRole('heading', { name: /indexing your notes/i })).toBeVisible();
  await page.getByRole('button', { name: /start indexing/i }).click();
  await expect(page.getByText(/indexed 1 note/i)).toBeVisible({ timeout: 30_000 });

  // Continue gate canAdvance checks totalNotes>0 && indexedNotes>=totalNotes.
  await page.getByRole('button', { name: /^continue$/i }).click();

  // ---- Done step ----
  await expect(page.getByRole('heading', { name: /you're set/i })).toBeVisible();
  await page.getByRole('button', { name: /open sanji/i }).click();

  // ---- Chat shell ----
  await expect(page.locator('header').getByText(/sanji/i).first()).toBeVisible();
  await expect(page.getByText(/^sources$/i)).toBeVisible();
}

// Merged into a single sequential test because Playwright shares the backend
// process across tests in this file: the runtime deps swap inside makeServer
// flips the backend to kind:'ready' on the first test's init call, and the
// flip persists for subsequent tests — so a second test that calls page.goto('/')
// would route straight to the ChatShell and skip the onboarding wizard. The
// flow below is the full v0.1 golden path: onboard → chat round-trip.
test('full golden path: onboarding through chat round-trip', async ({ page }) => {
  await walkOnboardingThroughIndexing(page);

  // The composer is the textarea inside the bg-card panel at the bottom of
  // the chat column. Type a message and fire ⌘↵ (or Ctrl+Enter on Linux).
  const composer = page.getByPlaceholder(/ask anything/i);
  await composer.fill('hi');

  // Cmd+Enter on macOS, Control+Enter elsewhere. The Composer accepts either
  // modifier (the keydown handler checks both metaKey and ctrlKey).
  await composer.press(process.platform === 'darwin' ? 'Meta+Enter' : 'Control+Enter');

  // The user turn appears right-aligned in bg-muted. The assistant turn comes
  // from OfflineFakeAdapter (env SANJI_OFFLINE_FAKE_LLM=1) which streams
  // "[offline-fake reply for model=<id>]" back via SSE.
  await expect(page.getByText('hi').first()).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText(/offline-fake reply/i)).toBeVisible({ timeout: 30_000 });
});
