// The shared config (UTC, file patterns) plus the app's Vite config, a DOM
// and the app's test setup.
import shared from '@bhojnalya/config/vitest';
import { defineConfig, mergeConfig } from 'vitest/config';

import vite from './vite.config';

export default mergeConfig(
  mergeConfig(shared, vite),
  defineConfig({
    test: {
      environment: 'jsdom',
      setupFiles: ['./src/testing/setup.ts'],
    },
  }),
);
