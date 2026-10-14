// Integration tests: the real Nest app against real Postgres in a throwaway
// container, connected as app_user (docs/conventions/testing-levels.md).
import { defineConfig } from 'vitest/config';

process.env.TZ = 'UTC';

export default defineConfig({
  test: {
    env: { TZ: 'UTC' },
    include: ['src/**/*.int.test.ts'],
    globalSetup: ['src/testing/global-setup.ts'],
    // The files share one database; run them one after another.
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 180_000,
  },
});
