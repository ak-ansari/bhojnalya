// Contract tests: what this app puts on the wire, asserted against the shared
// fixtures in packages/contracts/fixtures (docs/conventions/testing-levels.md).
import { defineConfig } from 'vitest/config';

process.env.TZ = 'UTC';

export default defineConfig({
  resolve: {
    alias: { '@': new URL('./src', import.meta.url).pathname },
  },
  test: {
    env: { TZ: 'UTC' },
    environment: 'jsdom',
    setupFiles: ['./src/testing/setup.ts'],
    include: ['src/**/*.contract.test.ts'],
  },
});
