import { defineConfig } from '@playwright/test';

// Both webServers run from the repo root (cwd: '../..') so pnpm filters resolve
// against the workspace. Backend uses tsx directly (no build, no watch) instead
// of `start` (needs a build) or `dev` (adds watch overhead). Frontend uses its
// `dev` script which boots vite on 5173 with the /api proxy to 8080.
//
// `reuseExistingServer` is true when not in CI so a developer can keep their
// usual `pnpm dev` running while iterating on the test; in CI we spawn fresh
// processes so the env is hermetic.
const reuse = !process.env.CI;
export default defineConfig({
  testDir: './e2e',
  webServer: [
    {
      command: 'pnpm --filter @sanji/backend exec tsx src/index.ts',
      port: 8080,
      reuseExistingServer: reuse,
      cwd: '../..',
      env: { PORT: '8080' },
      timeout: 60_000,
    },
    {
      command: 'pnpm --filter @sanji/frontend dev',
      port: 5173,
      reuseExistingServer: reuse,
      cwd: '../..',
      timeout: 60_000,
    },
  ],
  use: { baseURL: 'http://localhost:5173' },
  retries: 0,
  timeout: 60_000,
  workers: 1,
});
