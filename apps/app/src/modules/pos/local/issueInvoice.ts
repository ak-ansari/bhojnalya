// Issuing an invoice (invariant 6, TRD §7, ADR 0007). In one Dexie
// transaction: check the clock against the last invoice, take the next
// number from this device's series for the financial year, write the
// invoice, mark the order billed and append its `invoice.create` op. Any
// throw rolls back all of it, so a number is never used without its invoice
// and an invoice never exists without its op.
import {
  assertClockNotBehind,
  computeInvoice,
  financialYear,
  formatInvoiceNo,
  type InvoiceTotals,
} from '@bhojnalya/billing';
import {
  InvoiceCreatePayload,
  OrderUpsertPayload,
  paise,
  type OrderDiscount,
  type PriceMode,
  type TaxMode,
  type Uuidv7,
} from '@bhojnalya/contracts';
import { z } from 'zod';

import { DeviceNotPairedError, OrderAlreadyBilledError, OrderNotFoundError } from './errors';

import { readMeta, writeMeta, type PosDb } from '@/libs/local-db/db';
import { realDeps, type LocalDeps } from '@/libs/local-db/deps';
import { appendOp } from '@/libs/sync/outbox';

/** What the bill needs besides the order's own lines: the outlet's GST set-up and the cashier's choices. */
export interface BillInput {
  orderId: Uuidv7;
  taxMode: TaxMode;
  priceMode: PriceMode;
  /** GST state code of the outlet, e.g. "08". */
  placeOfSupply: string;
  /** The outlet's default GST rate; a taxed service charge follows it. */
  outletTaxRateBp: number;
  discount: z.output<typeof OrderDiscount> | null;
  serviceCharge: { rateBp: number; taxed: boolean } | null;
}

export interface IssuedInvoice {
  invoiceId: Uuidv7;
  invoiceNo: string;
  issuedAt: Date;
  totals: InvoiceTotals;
}

/** Throws `ClockBehindError`, `DeviceNotPairedError`, an order error or an engine `RangeError`; each writes nothing. */
export function issueInvoice(
  db: PosDb,
  bill: BillInput,
  deps: LocalDeps = realDeps,
): Promise<IssuedInvoice> {
  const issuedAt = deps.now();
  const fixedDeps: LocalDeps = { ...deps, now: () => issuedAt };
  const tables = [db.meta, db.deviceCounters, db.orders, db.invoices, db.outbox];

  return db.transaction('rw', tables, async () => {
    const lastInvoiceAt = await readMeta(db, 'lastInvoiceAt');
    assertClockNotBehind(issuedAt, lastInvoiceAt ? new Date(lastInvoiceAt) : null);
    const device = await readMeta(db, 'device');
    if (!device) throw new DeviceNotPairedError();
    const record = await db.orders.get(bill.orderId);
    if (!record) throw new OrderNotFoundError(bill.orderId);
    if (record.status === 'billed') throw new OrderAlreadyBilledError(bill.orderId);

    // An invoice line is the order item's snapshot without its kitchen note.
    const lines = OrderUpsertPayload.parse(record.order).items.map((item) => ({
      orderItemId: item.id,
      menuItemId: item.menuItemId,
      name: item.name,
      hsn: item.hsn,
      unitPrice: item.unitPrice,
      quantity: item.quantity,
      taxRateBp: item.taxRateBp,
      modifiers: item.modifiers,
    }));
    const totals = computeInvoice({ ...bill, lines });

    const fy = financialYear(issuedAt);
    const seq = ((await db.deviceCounters.get(fy))?.lastSeq ?? 0) + 1;
    const invoiceNo = formatInvoiceNo({
      prefix: device.outletPrefix,
      deviceCode: device.deviceCode,
      fy,
      seq,
    });
    const invoiceId = deps.newId();
    const payload: z.output<typeof InvoiceCreatePayload> = {
      orderId: bill.orderId,
      invoiceNo,
      issuedAt: issuedAt.toISOString(),
      taxMode: bill.taxMode,
      priceMode: bill.priceMode,
      placeOfSupply: bill.placeOfSupply,
      outletTaxRateBp: bill.outletTaxRateBp,
      lines,
      discount: bill.discount,
      serviceCharge: bill.serviceCharge,
      totals: {
        taxableValue: paise(totals.taxableValue),
        cgst: paise(totals.cgst),
        sgst: paise(totals.sgst),
        discount: paise(totals.discount),
        serviceCharge: paise(totals.serviceCharge?.amount ?? 0n),
        roundOff: paise(totals.roundOff),
        grandTotal: paise(totals.grandTotal),
      },
    };

    await db.deviceCounters.put({ fy, lastSeq: seq });
    await db.invoices.add({
      id: invoiceId,
      invoiceNo,
      orderId: bill.orderId,
      issuedAt: payload.issuedAt,
      invoice: z.encode(InvoiceCreatePayload, payload),
    });
    await db.orders.update(bill.orderId, { status: 'billed' });
    await appendOp(db, { type: 'invoice.create', entityId: invoiceId, payload }, fixedDeps);
    await writeMeta(db, 'lastInvoiceAt', payload.issuedAt);
    return { invoiceId, invoiceNo, issuedAt, totals };
  });
}
