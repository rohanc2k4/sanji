import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts', 'src/**/*.test.ts'],
    testTimeout: 15_000,
    pool: 'forks',
    poolOptions: { forks: { singleFork: true } },
  },
});
