// Saving an order on the till: the order row and its `order.upsert` op in one
// transaction (invariant 7). The same path runs online and offline.
import { OrderUpsertPayload, type Uuidv7 } from '@bhojnalya/contracts';
import { z } from 'zod';

import { OrderAlreadyBilledError } from './errors';

import type { PosDb } from '@/libs/local-db/db';
import { realDeps, type LocalDeps } from '@/libs/local-db/deps';
import { appendOp } from '@/libs/sync/outbox';

export type OrderPayload = z.output<typeof OrderUpsertPayload>;

/** Creates or replaces an open order. A billed order is never changed. */
export function saveOrder(
  db: PosDb,
  orderId: Uuidv7,
  order: OrderPayload,
  deps: LocalDeps = realDeps,
): Promise<void> {
  return db.transaction('rw', [db.orders, db.meta, db.outbox], async () => {
    const existing = await db.orders.get(orderId);
    if (existing?.status === 'billed') throw new OrderAlreadyBilledError(orderId);
    await db.orders.put({
      id: orderId,
      status: 'open',
      updatedAt: order.updatedAt,
      order: z.encode(OrderUpsertPayload, order),
    });
    await appendOp(db, { type: 'order.upsert', entityId: orderId, payload: order }, deps);
  });
}
