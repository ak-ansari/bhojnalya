// The guest menu's script budget, enforced on every build (ADR 0013, ADR 0023).
import { gzipSync } from 'node:zlib';

import type { Plugin } from 'vite';

/** 120 KB of gzipped JS, counted in decimal kilobytes so the check errs strict. */
export const JS_BUDGET_BYTES = 120 * 1000;

export interface EmittedScript {
  fileName: string;
  code: string;
}

export interface JsBudgetReport {
  limitBytes: number;
  totalGzipBytes: number;
  withinBudget: boolean;
  files: { fileName: string; gzipBytes: number }[];
}

/** Fails the Vite build when every emitted JS chunk, gzipped and summed, is over the limit. */
export function jsBudget(limitBytes: number = JS_BUDGET_BYTES): Plugin {
  return {
    name: 'bhojnalya:js-budget',
    apply: 'build',
    generateBundle(_options, bundle) {
      const scripts = Object.values(bundle).flatMap((output) =>
        output.type === 'chunk' ? [{ fileName: output.fileName, code: output.code }] : [],
      );
      const report = measureJsBudget(scripts, limitBytes);
      if (!report.withinBudget) this.error(describeJsBudget(report));
      console.info(describeJsBudget(report));
    },
  };
}

export function measureJsBudget(scripts: EmittedScript[], limitBytes: number): JsBudgetReport {
  const files = scripts.map(({ fileName, code }) => ({
    fileName,
    gzipBytes: gzipSync(code).byteLength,
  }));
  const totalGzipBytes = files.reduce((sum, file) => sum + file.gzipBytes, 0);
  return { limitBytes, totalGzipBytes, withinBudget: totalGzipBytes <= limitBytes, files };
}

export function describeJsBudget(report: JsBudgetReport): string {
  const verdict = report.withinBudget ? 'within' : 'OVER';
  const lines = report.files.map((file) => `  ${file.fileName}: ${String(file.gzipBytes)} B`);
  return [
    `guest menu JS is ${String(report.totalGzipBytes)} B gzipped, ${verdict} its budget of ${String(report.limitBytes)} B`,
    ...lines,
  ].join('\n');
}
