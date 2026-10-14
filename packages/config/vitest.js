// Shared Vitest config. Tests run in UTC (docs/conventions/testing-levels.md);
// IST is asserted explicitly at FY and day-end boundaries, never inherited
// from the machine. TZ is set here, before Vitest starts its workers, so they
// inherit it, and again through test.env for the worker's own process.env.
import { defineConfig } from 'vitest/config';

process.env.TZ = 'UTC';

export default defineConfig({
  test: {
    env: { TZ: 'UTC' },
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    exclude: ['**/*.int.test.ts', '**/*.contract.test.ts', '**/node_modules/**', '**/dist/**'],
  },
});
