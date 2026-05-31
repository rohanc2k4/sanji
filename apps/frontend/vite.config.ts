/// <reference types="vitest" />
import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:8080',
      '/ws': { target: 'ws://localhost:8080', ws: true },
    },
  },
  // Vitest reads this `test` block. Exclude the Playwright suite — those specs
  // import from `@playwright/test` (not vitest) and need a real browser.
  test: {
    exclude: ['e2e/**', 'node_modules/**', 'dist/**'],
    // Route .test.tsx files (React component tests) to the jsdom environment.
    // Plain .test.ts files stay in node (the default) — no DOM needed for logic.
    environmentMatchGlobs: [
      ['**/*.test.tsx', 'jsdom'],
    ],
    setupFiles: ['./src/test-setup.ts'],
  },
});
