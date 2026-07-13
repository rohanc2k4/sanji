// Vitest setup file. Loaded once per worker before any tests run.
// Extends `expect` with jest-dom matchers (`toBeInTheDocument`, `toBeDisabled`,
// etc.) so component tests can assert against the rendered DOM.
import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// RTL's auto-cleanup only triggers when `afterEach` is globally available.
// Vitest doesn't expose globals by default, so wire cleanup explicitly so
// each test starts with an empty DOM.
afterEach(() => {
  cleanup();
});
