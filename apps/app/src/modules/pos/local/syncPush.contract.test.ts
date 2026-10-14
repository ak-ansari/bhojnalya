// The POS side of the sync-push contract: what the outbox pushes equals the
// shared fixture, document for document (docs/conventions/testing-levels.md).
import { KotCreatePayload, paise, type SyncPushRequestWire } from '@bhojnalya/contracts';
import fixture from '@bhojnalya/contracts/fixtures/sync-push.json';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { issueInvoice } from './issueInvoice';
import { saveOrder } from './orders';
import { recordPayment } from './payments';

import { API_ENDPOINTS } from '@/libs/api/endpoints';
import { writeMeta } from '@/libs/local-db/db';
import { appendOp } from '@/libs/sync/outbox';
import { createSyncRunner } from '@/libs/sync/syncRunner';
import { server } from '@/mocks/server';
import { chaiAndSandwich, createTestDb, pairDevice, testDeps } from '@/testing/localDb';

const [orderOp, kotOp, invoiceOp, paymentOp] = fixture.ops as [
  (typeof fixture.ops)[0],
  (typeof fixture.ops)[1],
  (typeof fixture.ops)[2],
  (typeof fixture.ops)[3],
];

describe('sync push contract (POS side)', () => {
  it('pushes the order, KOT, invoice and payment of the fixture exactly as written there', async () => {
    const db = createTestDb();
    // Ids in the order the writes ask for them: op ids, then each record's own id before its op.
    const deps = testDeps(orderOp.createdAt, [
      orderOp.opId,
      kotOp.opId,
      invoiceOp.entityId,
      invoiceOp.opId,
      paymentOp.entityId,
      paymentOp.opId,
    ]);
    await pairDevice(db, { deviceId: fixture.deviceId, outletPrefix: 'BL', deviceCode: '0A' });
    await writeMeta(db, 'deviceSeq', 40);
    await db.deviceCounters.put({ fy: '2627', lastSeq: 41 });
    const orderId = orderOp.entityId as never;

    await saveOrder(db, orderId, chaiAndSandwich(orderOp.payload.updatedAt), deps);
    // KOTs are not built on the till yet; their op goes through the same outbox.
    deps.setNow(kotOp.createdAt);
    await db.transaction('rw', [db.meta, db.outbox], () =>
      appendOp(
        db,
        {
          type: 'kot.create',
          entityId: kotOp.entityId as never,
          payload: KotCreatePayload.parse(kotOp.payload),
        },
        deps,
      ),
    );
    deps.setNow(invoiceOp.createdAt);
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
    deps.setNow(paymentOp.createdAt);
    await recordPayment(
      db,
      {
        invoiceId,
        method: 'cash',
        amount: paise(20000),
        receivedAt: paymentOp.payload.receivedAt as string,
      },
      deps,
    );

    const pushed: SyncPushRequestWire[] = [];
    server.use(
      http.post(API_ENDPOINTS.SYNC.PUSH, async ({ request }) => {
        const body = (await request.json()) as SyncPushRequestWire;
        pushed.push(body);
        return HttpResponse.json({ acked: body.ops.map((op) => op.opId), rejected: [] });
      }),
    );
    await createSyncRunner({ db, isOnline: () => true }).syncNow();

    expect(pushed).toEqual([fixture]);
  });
});
