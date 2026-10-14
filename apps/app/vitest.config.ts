import shared from '@bhojnalya/config/vitest';
import { defineConfig, mergeConfig } from 'vitest/config';

// Component tests render into jsdom with MSW at the HTTP boundary (src/testing/setup.ts).
export default mergeConfig(
  shared,
  defineConfig({
    resolve: {
      alias: { '@': new URL('./src', import.meta.url).pathname },
    },
    test: { environment: 'jsdom', setupFiles: ['./src/testing/setup.ts'] },
  }),
);
