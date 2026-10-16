import base from '@bhojnalya/config/vitest';
import { defineConfig, mergeConfig } from 'vitest/config';

// The billing engine's bar is 100% branch coverage (billing-engine skill);
// the test run fails below it.
export default mergeConfig(
  base,
  defineConfig({
    test: {
      // fast-check runs per property (src/totals.property.test.ts): 500 keeps
      // the gate fast under load; a nightly job sets FC_NUM_RUNS higher.
      provide: { fcNumRuns: Number(process.env.FC_NUM_RUNS ?? 500) },
      coverage: {
        provider: 'v8',
        include: ['src/**/*.ts'],
        exclude: ['src/**/*.test.ts'],
        thresholds: { branches: 100, functions: 100, lines: 100, statements: 100 },
      },
    },
  }),
);
