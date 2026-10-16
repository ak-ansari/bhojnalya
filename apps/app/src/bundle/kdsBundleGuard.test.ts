import type { Rollup } from 'vite';
import { describe, expect, it } from 'vitest';

import { forbiddenInKdsChunks, KDS_RULE } from './kdsBundleGuard';

const DEXIE = '/repo/node_modules/.pnpm/dexie@4.4.6/node_modules/dexie/dist/modern/dexie.mjs';

/** Only the fields the guard reads. */
function chunk(
  fileName: string,
  options: { entry?: boolean; facade?: string; imports?: string[]; modules?: string[] },
): Rollup.OutputChunk {
  return {
    type: 'chunk',
    fileName,
    isEntry: options.entry ?? false,
    facadeModuleId: options.facade ?? null,
    imports: options.imports ?? [],
    modules: Object.fromEntries((options.modules ?? []).map((id) => [id, {}])),
  } as unknown as Rollup.OutputChunk;
}

function bundle(...chunks: Rollup.OutputChunk[]): Rollup.OutputBundle {
  return Object.fromEntries(chunks.map((c) => [c.fileName, c]));
}

describe('forbiddenInKdsChunks', () => {
  it('finds the local database in the entry chunk every device loads', () => {
    const output = bundle(
      chunk('index.js', { entry: true, modules: ['/repo/apps/app/src/main.tsx', DEXIE] }),
    );

    expect(forbiddenInKdsChunks(output, KDS_RULE)).toEqual([{ chunk: 'index.js', module: DEXIE }]);
  });

  it('finds it in a chunk a KDS route imports statically', () => {
    const output = bundle(
      chunk('index.js', { entry: true }),
      chunk('KdsLayout.js', {
        facade: '/repo/apps/app/src/modules/kds/components/KdsLayout.tsx',
        imports: ['shared.js'],
      }),
      chunk('shared.js', { modules: [DEXIE] }),
    );

    expect(forbiddenInKdsChunks(output, KDS_RULE)).toEqual([{ chunk: 'shared.js', module: DEXIE }]);
  });

  it("finds the till's own modules in a chunk the KDS loads", () => {
    const POS_LAYOUT = '/repo/apps/app/src/modules/pos/components/PosLayout.tsx';
    const output = bundle(
      chunk('index.js', { entry: true, imports: ['shared.js'] }),
      chunk('shared.js', { modules: ['/repo/apps/app/src/libs/i18n/i18n.ts', POS_LAYOUT] }),
    );

    expect(forbiddenInKdsChunks(output, KDS_RULE)).toEqual([
      { chunk: 'shared.js', module: POS_LAYOUT },
    ]);
  });

  it('allows them in chunks only the POS loads', () => {
    const output = bundle(
      chunk('index.js', { entry: true, modules: ['/repo/apps/app/src/main.tsx'] }),
      chunk('KdsLayout.js', {
        facade: '/repo/apps/app/src/modules/kds/components/KdsLayout.tsx',
        imports: ['index.js'],
      }),
      chunk('PosLayout.js', {
        facade: '/repo/apps/app/src/modules/pos/components/PosLayout.tsx',
        imports: ['db.js', 'index.js'],
        modules: ['/repo/apps/app/src/modules/pos/components/PosLayout.tsx'],
      }),
      chunk('db.js', { modules: [DEXIE] }),
    );

    expect(forbiddenInKdsChunks(output, KDS_RULE)).toEqual([]);
  });
});
