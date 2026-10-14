import { describe, expect, it } from 'vitest';

import { assertOutboxEmpty, clearLocalData, OutboxNotEmptyError } from './safetyRails';

import { writeMeta } from '@/libs/local-db/db';
import { createTestDb, pairDevice, seedOps, testDeps } from '@/testing/localDb';

describe('safetyRails', () => {
  it('refuses to clear local data while ops are waiting, and says how many', async () => {
    const db = createTestDb();
    await pairDevice(db);
    await seedOps(db, 3, testDeps());

    const error: unknown = await clearLocalData(db).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(OutboxNotEmptyError);
    expect((error as OutboxNotEmptyError).waiting).toBe(3);
    expect(await db.outbox.count()).toBe(3);
    expect(await db.meta.get('device')).toBeDefined();
  });

  it('refuses while the only waiting op is one the server refused', async () => {
    const db = createTestDb();
    await seedOps(db, 1, testDeps());
    await db.outbox.update(1, { rejection: { reason: 'VALIDATION_FAILED', at: 'x' } });

    await expect(assertOutboxEmpty(db)).rejects.toBeInstanceOf(OutboxNotEmptyError);
    await expect(clearLocalData(db)).rejects.toBeInstanceOf(OutboxNotEmptyError);
  });

  it('wipes every table, the device identity and counters included, once all is synced', async () => {
    const db = createTestDb();
    await pairDevice(db);
    await db.deviceCounters.put({ fy: '2627', lastSeq: 42 });
    await writeMeta(db, 'lastInvoiceAt', '2026-10-14T06:31:00.000Z');

    await assertOutboxEmpty(db);
    await clearLocalData(db);

    const counts = await Promise.all(db.allTables.map((table) => table.count()));
    expect(counts.every((count) => count === 0)).toBe(true);
  });
});
