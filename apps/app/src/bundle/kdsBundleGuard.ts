// Build-time check that the kitchen display stays light: everything a KDS
// downloads (the entry chunk, the KDS route chunks and what they import
// statically) must not contain the till's local database or its screens.
// Runs in vite.config.ts on every build, so a stray import fails CI, not a review.
import type { Plugin, Rollup } from 'vite';

export interface BundleRule {
  /** Source modules whose chunks a KDS device loads, besides the entry. */
  kdsRoots: RegExp;
  /** Modules a KDS device must never download. */
  forbidden: RegExp;
}

/** Dexie (the till's local database) and the till's own screens and writes. */
export const KDS_RULE: BundleRule = {
  kdsRoots: /[\\/]src[\\/]modules[\\/]kds[\\/]/,
  forbidden:
    /[\\/]node_modules[\\/](?:\.pnpm[\\/][^\\/]+[\\/]node_modules[\\/])?dexie[\\/]|[\\/]src[\\/]modules[\\/]pos[\\/]/,
};

export function kdsBundleGuard(rule: BundleRule = KDS_RULE): Plugin {
  return {
    name: 'bhojnalya:kds-bundle-guard',
    apply: 'build',
    generateBundle(_options, bundle) {
      const offenders = forbiddenInKdsChunks(bundle, rule);
      if (offenders.length > 0) {
        this.error(
          `The KDS would download modules it must not: ${offenders
            .map(({ chunk, module }) => `${module} (in ${chunk})`)
            .join(', ')}`,
        );
      }
    },
  };
}

export interface Offender {
  chunk: string;
  module: string;
}

/** Every forbidden module in a chunk a KDS loads, with the chunk that carries it. */
export function forbiddenInKdsChunks(bundle: Rollup.OutputBundle, rule: BundleRule): Offender[] {
  const chunks = new Map<string, Rollup.OutputChunk>();
  for (const output of Object.values(bundle)) {
    if (output.type === 'chunk') chunks.set(output.fileName, output);
  }
  return [...kdsChunkClosure(chunks, rule)].flatMap((fileName) =>
    Object.keys(chunks.get(fileName)?.modules ?? {})
      .filter((id) => rule.forbidden.test(id))
      .map((module) => ({ chunk: fileName, module })),
  );
}

/** The entry chunks, the chunks rooted at a KDS module, and their static imports. */
function kdsChunkClosure(chunks: Map<string, Rollup.OutputChunk>, rule: BundleRule): Set<string> {
  const queue = [...chunks.values()]
    .filter((chunk) => chunk.isEntry || rule.kdsRoots.test(chunk.facadeModuleId ?? ''))
    .map((chunk) => chunk.fileName);
  const seen = new Set<string>();
  for (let next = queue.pop(); next !== undefined; next = queue.pop()) {
    if (seen.has(next)) continue;
    seen.add(next);
    queue.push(...(chunks.get(next)?.imports ?? []));
  }
  return seen;
}
