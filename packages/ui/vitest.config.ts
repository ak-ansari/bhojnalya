import shared from '@bhojnalya/config/vitest';
import { defineConfig, mergeConfig } from 'vitest/config';

// Components render into jsdom; jest-dom adds the DOM matchers.
export default mergeConfig(
  shared,
  defineConfig({
    test: { environment: 'jsdom', setupFiles: ['./src/testing/setup.ts'] },
  }),
);
