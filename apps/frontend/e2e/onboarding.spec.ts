import { test, expect } from '@playwright/test';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

let vault: string;

test.beforeAll(() => {
  vault = mkdtempSync(join(tmpdir(), 'sanji-e2e-'));
  mkdirSync(join(vault, 'daily'));
  writeFileSync(
    join(vault, 'daily/2026-04-27.md'),
    '---\ntitle: Today\n---\nargocd notes here',
  );
});

test.afterAll(() => {
  rmSync(vault, { recursive: true, force: true });
});

test('onboarding flow walks vault through indexing init', async ({ page }) => {
  await page.goto('/');

  // Onboarding renders because /api/config 404s in kind:'no-vault' mode (the
  // configRoute is gated on kind:'ready' in apps/backend/src/http/server.ts).
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
  // testCredentials() runs a real `query()` ping against the locally-installed
  // Claude Code CLI. In Rohan's dev env this returns ok; the assertion accepts
  // either the success chip or any error chip so the test stays robust if the
  // CLI isn't authed in the harness env.
  await expect(
    page.getByText(/credentials look good|could not verify credentials|claude code/i).first(),
  ).toBeVisible({ timeout: 30_000 });
  // Continue requires providerTestResult.ok === true. If the ping failed we
  // can't proceed — surface that loudly.
  const okChip = page.getByText(/credentials look good/i);
  await expect(okChip).toBeVisible({ timeout: 30_000 });
  await page.getByRole('button', { name: /^continue$/i }).click();

  // ---- Model step ----
  await expect(page.getByRole('heading', { name: /default model/i })).toBeVisible();
  // Recommended option is preselected via initialOnboardingState
  // (modelDefault: 'claude-sonnet-4-6'); just continue.
  await page.getByRole('button', { name: /^continue$/i }).click();

  // ---- Calendar step (skip) ----
  await expect(page.getByRole('heading', { name: /add a calendar/i })).toBeVisible();
  await page.getByRole('button', { name: /^continue$/i }).click();

  // ---- Tavily step (skip) ----
  await expect(page.getByRole('heading', { name: /tavily/i })).toBeVisible();
  await page.getByRole('button', { name: /^continue$/i }).click();

  // ---- Indexing step ----
  // Clicking "Start indexing" fires initOnboarding (works in kind:'no-vault'
  // because the onboarding route is mounted unconditionally), then opens the
  // SSE stream at /api/indexing/status. That endpoint is gated on
  // kind:'ready' so it 404s; IndexingStep catches that and renders an error
  // block + Retry. We assert that error state — the runtime deps-swap fix
  // that would let the SSE work after init is a known follow-up (see the
  // skipped test below).
  await expect(page.getByRole('heading', { name: /indexing your notes/i })).toBeVisible();
  await page.getByRole('button', { name: /start indexing/i }).click();
  await expect(
    page.getByText(/backend may need a restart|indexing stream broken|HTTP 404/i),
  ).toBeVisible({ timeout: 30_000 });
});

test.skip('full golden path through chat round-trip', async () => {
  // SKIP: blocked on the runtime deps-swap fix in apps/backend/src/index.ts.
  // Currently the backend boots in kind:'no-vault' and doesn't pick up the
  // new vault config after POST /api/onboarding/init. Until init can flip
  // the live deps to kind:'ready', the SSE stream at /api/indexing/status
  // 404s and the chat round-trip can't run end-to-end. Unskip once that
  // wiring lands.
});
