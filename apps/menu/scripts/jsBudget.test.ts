import { randomBytes } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { JS_BUDGET_BYTES, describeJsBudget, measureJsBudget } from './jsBudget.js';

// Random base64 barely compresses, so its gzipped size tracks its length.
function incompressible(bytes: number): string {
  return randomBytes(bytes).toString('base64');
}

describe('jsBudget', () => {
  it('sets the budget at 120 000 bytes of gzipped JS', () => {
    expect(JS_BUDGET_BYTES).toBe(120_000);
  });

  it('sums the gzipped size of every emitted script against the limit', () => {
    const report = measureJsBudget(
      [
        { fileName: 'assets/index.js', code: incompressible(30_000) },
        { fileName: 'assets/lazy.js', code: incompressible(30_000) },
      ],
      100_000,
    );

    expect(report.files).toHaveLength(2);
    const [first, second] = report.files.map((file) => file.gzipBytes);
    expect(report.totalGzipBytes).toBe((first ?? 0) + (second ?? 0));
    expect(report.totalGzipBytes).toBeGreaterThan(60_000);
    expect(report.withinBudget).toBe(true);
  });

  it('fails a bundle whose scripts together are over the limit even if each is under it', () => {
    const report = measureJsBudget(
      [
        { fileName: 'assets/index.js', code: incompressible(60_000) },
        { fileName: 'assets/lazy.js', code: incompressible(60_000) },
      ],
      100_000,
    );

    expect(report.withinBudget).toBe(false);
    expect(describeJsBudget(report)).toMatch(/OVER its budget of 100000 B/);
  });

  it('passes a bundle exactly at the limit', () => {
    const code = 'x';
    const atLimit = measureJsBudget([{ fileName: 'a.js', code }], Infinity).totalGzipBytes;

    expect(measureJsBudget([{ fileName: 'a.js', code }], atLimit).withinBudget).toBe(true);
    expect(measureJsBudget([{ fileName: 'a.js', code }], atLimit - 1).withinBudget).toBe(false);
  });
});
