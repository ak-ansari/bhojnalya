import shared from '@bhojnalya/config/vitest';
import { defineConfig, mergeConfig } from 'vitest/config';

import { SRC_ALIAS } from './vite.config.js';

export default mergeConfig(
  shared,
  defineConfig({
    resolve: { alias: SRC_ALIAS },
    test: {
      environment: 'jsdom',
      // Appended to the shared src/** patterns by mergeConfig.
      include: ['scripts/**/*.test.ts'],
    },
  }),
);
