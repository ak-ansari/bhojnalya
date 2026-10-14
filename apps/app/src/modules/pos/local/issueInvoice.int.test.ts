import { describe, expect, it } from 'vitest';

import { issueInvoice, type BillInput } from './issueInvoice';
import { saveOrder } from './orders';

import { readMeta, type PosDb } from '@/libs/local-db/db';
import { createTestDb, pairDevice, testDeps, chaiAndSandwich } from '@/testing/localDb';

const ORDER_ID = '01a1391a-8228-7c42-911d-a096b40a1630' as BillInput['orderId'];

function bill(): BillInput {
  return {
    orderId: ORDER_ID,
    taxMode: 'regular',
    priceMode: 'inclusive',
    placeOfSupply: '08',
    outletTaxRateBp: 500,
    discount: null,
    serviceCharge: null,
  };
}

async function readyDb(): Promise<{ db: PosDb; deps: ReturnType<typeof testDeps> }> {
  const db = createTestDb();
  const deps = testDeps('2026-10-14T06:30:05.000Z');
  await pairDevice(db);
  await saveOrder(db, ORDER_ID, chaiAndSandwich(), deps);
  deps.setNow('2026-10-14T06:31:00.000Z');
  return { db, deps };
}

async function snapshot(db: PosDb) {
  return {
    counters: await db.deviceCounters.toArray(),
    invoices: await db.invoices.count(),
    outbox: await db.outbox.count(),
    orderStatus: (await db.orders.get(ORDER_ID))?.status,
    deviceSeq: await readMeta(db, 'deviceSeq'),
    lastInvoiceAt: await readMeta(db, 'lastInvoiceAt'),
  };
}

describe('issueInvoice transaction', () => {
  it('rolls back the counter, the invoice and the order when the outbox write throws', async () => {
    const { db, deps } = await readyDb();
    const before = await snapshot(db);
    db.outbox.hook('creating', () => {
      throw new Error('disk full');
    });

    await expect(issueInvoice(db, bill(), deps)).rejects.toThrow('disk full');

    expect(await snapshot(db)).toEqual(before);
    expect(before.counters).toEqual([]);
    expect(before.invoices).toBe(0);
  });

  it('rolls back the counter and the op when the invoice write fails', async () => {
    const { db, deps } = await readyDb();
    // A row already holding the next number makes the invoice insert fail its unique index.
    await db.invoices.add({
      id: 'other',
      invoiceNo: 'BL0A/2627/000001',
      orderId: 'other-order',
      issuedAt: '2026-10-14T06:00:00.000Z',
      invoice: {} as never,
    });
    const before = await snapshot(db);

    await expect(issueInvoice(db, bill(), deps)).rejects.toThrow();

    expect(await snapshot(db)).toEqual(before);
  });

  it('commits the counter, the invoice, the order and the op together when nothing throws', async () => {
    const { db, deps } = await readyDb();

    const issued = await issueInvoice(db, bill(), deps);

    const after = await snapshot(db);
    expect(issued.invoiceNo).toBe('BL0A/2627/000001');
    expect(after.counters).toEqual([{ fy: '2627', lastSeq: 1 }]);
    expect(after.invoices).toBe(1);
    expect(after.orderStatus).toBe('billed');
    expect(after.outbox).toBe(2);
    expect(after.deviceSeq).toBe(2);
    expect(after.lastInvoiceAt).toBe('2026-10-14T06:31:00.000Z');
  });

  it('gives the next attempt the number a failed attempt would have used', async () => {
    const { db, deps } = await readyDb();
    let fail = true;
    db.outbox.hook('creating', () => {
      if (fail) throw new Error('disk full');
    });
    await expect(issueInvoice(db, bill(), deps)).rejects.toThrow('disk full');
    fail = false;

    const issued = await issueInvoice(db, bill(), deps);

    expect(issued.invoiceNo).toBe('BL0A/2627/000001');
  });
});
