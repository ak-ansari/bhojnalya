// Integration tests: the POS's transactions on an emulated browser DB engine
// (fake-indexeddb), one fresh database per test (docs/conventions/testing-levels.md).
import { defineConfig } from 'vitest/config';

process.env.TZ = 'UTC';

export default defineConfig({
  resolve: {
    alias: { '@': new URL('./src', import.meta.url).pathname },
  },
  test: {
    env: { TZ: 'UTC' },
    environment: 'node',
    setupFiles: ['./src/testing/indexedDb.ts'],
    include: ['src/**/*.int.test.ts'],
  },
});
