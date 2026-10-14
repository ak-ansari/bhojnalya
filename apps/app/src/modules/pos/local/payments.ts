// Recording a payment against an invoice on this device: the payment row and
// its `payment.create` op in one transaction (invariant 7).
import { PaymentCreatePayload, type Uuidv7 } from '@bhojnalya/contracts';
import { z } from 'zod';

import { InvoiceNotFoundError } from './errors';

import type { PosDb } from '@/libs/local-db/db';
import { realDeps, type LocalDeps } from '@/libs/local-db/deps';
import { appendOp } from '@/libs/sync/outbox';

export type PaymentPayload = z.output<typeof PaymentCreatePayload>;

/** Returns the new payment's id. */
export function recordPayment(
  db: PosDb,
  payment: PaymentPayload,
  deps: LocalDeps = realDeps,
): Promise<Uuidv7> {
  return db.transaction('rw', [db.payments, db.invoices, db.meta, db.outbox], async () => {
    if (!(await db.invoices.get(payment.invoiceId))) {
      throw new InvoiceNotFoundError(payment.invoiceId);
    }
    const paymentId = deps.newId();
    await db.payments.add({
      id: paymentId,
      invoiceId: payment.invoiceId,
      payment: z.encode(PaymentCreatePayload, payment),
    });
    await appendOp(db, { type: 'payment.create', entityId: paymentId, payload: payment }, deps);
    return paymentId;
  });
}
