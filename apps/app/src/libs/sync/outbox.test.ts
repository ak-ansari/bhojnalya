import { describe, expect, it } from 'vitest';

import { appendOp, applyPushResult, countOutbox, pendingBatch, retryRejected } from './outbox';

import { readMeta } from '@/libs/local-db/db';
import { chaiAndSandwich, createTestDb, nth, seedOps, testDeps } from '@/testing/localDb';

describe('outbox', () => {
  it('never reuses a deviceSeq after its op has been acked', async () => {
    const db = createTestDb();
    const deps = testDeps();
    await seedOps(db, 2, deps);
    const batch = await pendingBatch(db);
    await applyPushResult(
      db,
      batch,
      { acked: batch.map((r) => r.opId as never), rejected: [] },
      deps.now(),
    );

    await seedOps(db, 1, deps);

    expect((await db.outbox.toArray()).map((r) => r.deviceSeq)).toEqual([3]);
    expect(await readMeta(db, 'deviceSeq')).toBe(3);
  });

  it('refuses to append an op outside a transaction', async () => {
    const db = createTestDb();
    const deps = testDeps();
    await expect(
      appendOp(
        db,
        { type: 'order.upsert', entityId: deps.newId(), payload: chaiAndSandwich() },
        deps,
      ),
    ).rejects.toThrow('inside the transaction');
    expect(await db.outbox.count()).toBe(0);
  });

  it('batches at most 200 ops, oldest first, skipping refused ones', async () => {
    const db = createTestDb();
    const deps = testDeps();
    await seedOps(db, 205, deps);
    await db.outbox.update(1, { rejection: { reason: 'VALIDATION_FAILED', at: 'x' } });

    const batch = await pendingBatch(db);

    expect(batch).toHaveLength(200);
    expect(batch.map((r) => r.deviceSeq)).toEqual(Array.from({ length: 200 }, (_, i) => i + 2));
  });

  it('removes acked ops, flags refused ones and keeps unanswered ones', async () => {
    const db = createTestDb();
    const deps = testDeps();
    await seedOps(db, 3, deps);
    const batch = await pendingBatch(db);
    const [a, b] = [nth(batch, 0), nth(batch, 1)];

    const outcome = await applyPushResult(
      db,
      batch,
      {
        acked: [a.opId as never, deps.newId()],
        rejected: [{ opId: b.opId as never, reason: 'VALIDATION_FAILED' }],
      },
      new Date('2026-10-14T07:00:00.000Z'),
    );

    expect(outcome).toEqual({ acked: 1, rejected: 1 });
    const left = await db.outbox.toArray();
    expect(left.map((r) => [r.deviceSeq, r.rejection])).toEqual([
      [2, { reason: 'VALIDATION_FAILED', at: '2026-10-14T07:00:00.000Z' }],
      [3, null],
    ]);
    expect(await countOutbox(db)).toEqual({ pending: 1, rejected: 1, total: 2 });
  });

  it('puts refused ops back in line when staff retry them', async () => {
    const db = createTestDb();
    const deps = testDeps();
    await seedOps(db, 2, deps);
    await db.outbox.update(1, { rejection: { reason: 'VALIDATION_FAILED', at: 'x' } });

    expect(await retryRejected(db)).toBe(1);

    expect((await pendingBatch(db)).map((r) => r.deviceSeq)).toEqual([1, 2]);
  });
});
