// Vitest setup file. Loaded once per worker before any tests run.
// Extends `expect` with jest-dom matchers (`toBeInTheDocument`, `toBeDisabled`,
// etc.) so component tests can assert against the rendered DOM.
import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// RTL renders accumulate in document.body across tests in a file. Without an
// explicit cleanup, global `screen` queries (used by the Mascot / OnboardingMascot
// component tests) find duplicate elements and throw. Wire cleanup so each test
// starts with an empty DOM. cleanup() no-ops in the node environment where
// nothing was rendered, so this is safe for the plain .test.ts logic suites too.
afterEach(() => {
  cleanup();
});
