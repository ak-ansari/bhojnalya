import { describe, expect, it } from 'vitest';

import { outboxToCsv, outboxToJson } from './exportOutbox';
import { pendingBatch } from './outbox';

import { createTestDb, nth, seedOps, testDeps } from '@/testing/localDb';

describe('exportOutbox', () => {
  it('exports every op as JSON exactly as it would be pushed', async () => {
    const db = createTestDb();
    const deps = testDeps();
    await seedOps(db, 2, deps);
    const ops = await db.outbox.toArray();

    const parsed: unknown = JSON.parse(
      outboxToJson({ deviceId: 'd', exportedAt: '2026-10-14T07:00:00.000Z', ops }),
    );

    expect(parsed).toEqual({ deviceId: 'd', exportedAt: '2026-10-14T07:00:00.000Z', ops });
  });

  it('exports one CSV row per op, with refused ops and their reason', async () => {
    const db = createTestDb();
    const deps = testDeps();
    await seedOps(db, 2, deps);
    await db.outbox.update(2, { rejection: { reason: 'VALIDATION_FAILED', at: 'x' } });
    const records = await db.outbox.toArray();
    const first = nth(records, 0);

    const lines = outboxToCsv(records).trimEnd().split('\r\n');

    expect(lines[0]).toBe(
      'deviceSeq,opId,type,entityId,createdAt,invoiceNo,amountPaise,status,reason',
    );
    expect(lines).toHaveLength(3);
    expect(lines[1]).toBe(
      `1,${first.opId},order.upsert,${first.op.entityId},2026-10-14T06:30:00.000Z,,,pending,`,
    );
    expect(lines[2]).toMatch(/^2,.*,refused,VALIDATION_FAILED$/);
    expect(await pendingBatch(db)).toHaveLength(1);
  });

  it('quotes a field holding a comma or a quote', async () => {
    const db = createTestDb();
    await seedOps(db, 1, testDeps());
    const record = nth(await db.outbox.toArray(), 0);

    const csv = outboxToCsv([{ ...record, rejection: { reason: 'A, "B"', at: 'x' } }]);

    expect(csv).toContain(',"A, ""B"""\r\n');
  });
});
