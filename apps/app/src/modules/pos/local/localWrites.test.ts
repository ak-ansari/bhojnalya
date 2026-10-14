import { paise } from '@bhojnalya/contracts';
import { describe, expect, it } from 'vitest';

import { issueInvoice } from './issueInvoice';
import { saveOrder } from './orders';
import { recordPayment } from './payments';

import { chaiAndSandwich, createTestDb, nth, pairDevice, testDeps } from '@/testing/localDb';

describe('POS local writes', () => {
  it('gives every local change an op with a strictly increasing deviceSeq', async () => {
    const db = createTestDb();
    const deps = testDeps();
    await pairDevice(db);
    const orderId = deps.newId();
    await saveOrder(db, orderId, chaiAndSandwich(), deps);
    await saveOrder(db, orderId, chaiAndSandwich(), deps);
    const { invoiceId } = await issueInvoice(
      db,
      {
        orderId,
        taxMode: 'regular',
        priceMode: 'inclusive',
        placeOfSupply: '08',
        outletTaxRateBp: 500,
        discount: null,
        serviceCharge: null,
      },
      deps,
    );
    await recordPayment(
      db,
      {
        invoiceId,
        method: 'cash',
        amount: paise(20000),
        receivedAt: '2026-10-14T06:31:30.000Z',
      },
      deps,
    );

    const ops = await db.outbox.orderBy('deviceSeq').toArray();
    expect(ops.map((record) => [record.deviceSeq, record.op.deviceSeq, record.op.type])).toEqual([
      [1, 1, 'order.upsert'],
      [2, 2, 'order.upsert'],
      [3, 3, 'invoice.create'],
      [4, 4, 'payment.create'],
    ]);
  });

  it('writes neither the order nor its op when the op breaks the contract', async () => {
    const db = createTestDb();
    const deps = testDeps();
    const order = chaiAndSandwich();
    const broken = { ...order, items: [{ ...nth(order.items, 0), hsn: 'not-hsn' }] };

    await expect(saveOrder(db, deps.newId(), broken, deps)).rejects.toThrow();

    expect(await db.orders.count()).toBe(0);
    expect(await db.outbox.count()).toBe(0);
  });
});
