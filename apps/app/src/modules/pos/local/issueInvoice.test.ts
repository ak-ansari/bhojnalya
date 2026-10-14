import { ClockBehindError } from '@bhojnalya/billing';
import { SyncOp, type Uuidv7 } from '@bhojnalya/contracts';
import { describe, expect, it } from 'vitest';

import { DeviceNotPairedError, OrderAlreadyBilledError, OrderNotFoundError } from './errors';
import { issueInvoice, type BillInput } from './issueInvoice';
import { saveOrder } from './orders';

import type { PosDb } from '@/libs/local-db/db';
import {
  chaiAndSandwich,
  createTestDb,
  pairDevice,
  testDeps,
  type TestDeps,
} from '@/testing/localDb';

function bill(orderId: Uuidv7): BillInput {
  return {
    orderId,
    taxMode: 'regular',
    priceMode: 'inclusive',
    placeOfSupply: '08',
    outletTaxRateBp: 500,
    discount: null,
    serviceCharge: null,
  };
}

/** Saves a fresh order at the deps' current time and bills it. */
async function billNewOrder(db: PosDb, deps: TestDeps) {
  const orderId = deps.newId();
  await saveOrder(db, orderId, chaiAndSandwich(deps.now().toISOString()), deps);
  return issueInvoice(db, bill(orderId), deps);
}

describe('issueInvoice', () => {
  it('numbers invoices from the device series, one after another', async () => {
    const db = createTestDb();
    const deps = testDeps('2026-10-14T06:31:00.000Z');
    await pairDevice(db);

    const first = await billNewOrder(db, deps);
    const second = await billNewOrder(db, deps);

    expect(first.invoiceNo).toBe('BL0A/2627/000001');
    expect(second.invoiceNo).toBe('BL0A/2627/000002');
  });

  it('starts a new series at 000001 on 1 April in IST', async () => {
    const db = createTestDb();
    const deps = testDeps('2027-03-31T18:29:59.000Z');
    await pairDevice(db);

    const lastOfYear = await billNewOrder(db, deps);
    deps.setNow('2027-03-31T18:30:00.000Z');
    const firstOfYear = await billNewOrder(db, deps);

    expect(lastOfYear.invoiceNo).toBe('BL0A/2627/000001');
    expect(firstOfYear.invoiceNo).toBe('BL0A/2728/000001');
    expect(await db.deviceCounters.toArray()).toEqual([
      { fy: '2627', lastSeq: 1 },
      { fy: '2728', lastSeq: 1 },
    ]);
  });

  it('refuses to bill when the clock is behind the last invoice, and writes nothing', async () => {
    const db = createTestDb();
    const deps = testDeps('2026-10-14T06:31:00.000Z');
    await pairDevice(db);
    await billNewOrder(db, deps);
    const orderId = deps.newId();
    await saveOrder(db, orderId, chaiAndSandwich(), deps);
    const outboxBefore = await db.outbox.count();

    deps.setNow('2026-10-14T06:30:59.999Z');
    await expect(issueInvoice(db, bill(orderId), deps)).rejects.toBeInstanceOf(ClockBehindError);

    expect(await db.invoices.count()).toBe(1);
    expect(await db.outbox.count()).toBe(outboxBefore);
    expect(await db.deviceCounters.get('2627')).toEqual({ fy: '2627', lastSeq: 1 });
  });

  it('bills at the same instant as the last invoice', async () => {
    const db = createTestDb();
    const deps = testDeps('2026-10-14T06:31:00.000Z');
    await pairDevice(db);
    await billNewOrder(db, deps);

    await expect(billNewOrder(db, deps)).resolves.toMatchObject({
      invoiceNo: 'BL0A/2627/000002',
    });
  });

  it('appends invoice.create with the engine totals and the next deviceSeq', async () => {
    const db = createTestDb();
    const deps = testDeps('2026-10-14T06:31:00.000Z');
    await pairDevice(db);

    const issued = await billNewOrder(db, deps);

    const ops = await db.outbox.orderBy('deviceSeq').toArray();
    expect(ops.map((record) => [record.deviceSeq, record.op.type])).toEqual([
      [1, 'order.upsert'],
      [2, 'invoice.create'],
    ]);
    const op = SyncOp.parse(ops[1]?.op);
    expect(op.entityId).toBe(issued.invoiceId);
    expect(op.createdAt).toBe('2026-10-14T06:31:00.000Z');
    expect(op.type === 'invoice.create' && op.payload.totals).toEqual({
      taxableValue: 19048n,
      cgst: 477n,
      sgst: 475n,
      discount: 0n,
      serviceCharge: 0n,
      roundOff: 0n,
      grandTotal: 20000n,
    });
    expect(issued.totals.grandTotal).toBe(20000n);
  });

  it('refuses a device that is not paired', async () => {
    const db = createTestDb();
    const deps = testDeps();
    await expect(billNewOrder(db, deps)).rejects.toBeInstanceOf(DeviceNotPairedError);
  });

  it('refuses an order that is not on the device', async () => {
    const db = createTestDb();
    const deps = testDeps();
    await pairDevice(db);
    await expect(issueInvoice(db, bill(deps.newId()), deps)).rejects.toBeInstanceOf(
      OrderNotFoundError,
    );
  });

  it('refuses to bill an order twice', async () => {
    const db = createTestDb();
    const deps = testDeps();
    await pairDevice(db);
    const orderId = deps.newId();
    await saveOrder(db, orderId, chaiAndSandwich(), deps);
    await issueInvoice(db, bill(orderId), deps);

    await expect(issueInvoice(db, bill(orderId), deps)).rejects.toBeInstanceOf(
      OrderAlreadyBilledError,
    );
    expect(await db.invoices.count()).toBe(1);
  });
});
