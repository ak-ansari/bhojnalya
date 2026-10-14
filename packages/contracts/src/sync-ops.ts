// The operations a POS pushes through sync (invariant 7, TRD §8.3). One op is a
// change the device already made locally: its type picks its payload.
//
// Payloads are strict: an unknown field is a validation error, not silently
// stripped, so a newer client's data is rejected visibly and stays in its
// outbox instead of being half-applied (TRD §8.3: data is never dropped).
// Orders, KOTs and invoices snapshot name, price, tax rate and HSN
// (invariant 5). Schemas are declared before use because they are constants.
import { z } from 'zod';

import { OrderChannel, OrderType, PaymentMethod, PriceMode, TaxMode } from './enums.js';
import { Uuidv7 } from './ids.js';
import { PaiseWire } from './money.js';

/** Every op type, as the literal sent on the wire. */
export const SYNC_OP_TYPES = [
  'order.upsert',
  'kot.create',
  'invoice.create',
  'payment.create',
  'invoice.cancel',
] as const;
export type SyncOpType = (typeof SYNC_OP_TYPES)[number];

/** A UTC instant, ISO 8601 with `Z`. */
export const IsoInstant = z.iso.datetime();

/** A GST or percentage rate in basis points: 500 is 5%. Integer, so no float ever holds a rate. */
export const RateBp = z.number().int().min(0).max(10_000);

/** An invoice number from a device series: `{PP}{DD}/{FYFY}/{NNNNNN}`, 16 chars (ADR 0007). */
export const InvoiceNo = z
  .string()
  .regex(/^[A-Z0-9]{4}\/\d{4}\/\d{6}$/, 'must look like BL0A/2627/000042');

const Name = z.string().min(1).max(200);
const Hsn = z.string().regex(/^\d{4,8}$/, 'HSN/SAC is 4 to 8 digits');
const Quantity = z.number().int().min(1);

export const ModifierSnapshot = z.strictObject({
  modifierId: Uuidv7,
  name: Name,
  price: PaiseWire,
});

/** What was sold, copied from the menu at the time: later menu edits never change it. */
const LineSnapshot = z.strictObject({
  menuItemId: Uuidv7,
  name: Name,
  hsn: Hsn,
  unitPrice: PaiseWire,
  quantity: Quantity,
  taxRateBp: RateBp,
  modifiers: z.array(ModifierSnapshot),
});

export const OrderItem = LineSnapshot.extend({
  id: Uuidv7,
  note: z.string().max(200).optional(),
});

export const OrderUpsertPayload = z.strictObject({
  channel: OrderChannel,
  type: OrderType,
  tableId: Uuidv7.nullable(),
  items: z.array(OrderItem),
  /** Field-level last-writer-wins between POS devices compares this (TRD §8.3). */
  updatedAt: IsoInstant,
});

export const KotCreatePayload = z.strictObject({
  orderId: Uuidv7,
  /** Numbered per device per business day. */
  kotNo: z.number().int().min(1),
  businessDate: z.iso.date(),
  items: z
    .array(
      z.strictObject({
        orderItemId: Uuidv7,
        name: Name,
        quantity: Quantity,
        note: z.string().max(200).optional(),
      }),
    )
    .min(1),
});

export const InvoiceLine = LineSnapshot.extend({ orderItemId: Uuidv7 });

export const OrderDiscount = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('flat'), amount: PaiseWire }),
  z.strictObject({ kind: z.literal('percent'), rateBp: RateBp }),
]);

/** The totals as printed on the device; the server re-runs the engine and compares. */
export const InvoiceTotals = z.strictObject({
  taxableValue: PaiseWire,
  cgst: PaiseWire,
  sgst: PaiseWire,
  discount: PaiseWire,
  serviceCharge: PaiseWire,
  roundOff: PaiseWire,
  grandTotal: PaiseWire,
});

export const InvoiceCreatePayload = z.strictObject({
  orderId: Uuidv7,
  invoiceNo: InvoiceNo,
  issuedAt: IsoInstant,
  taxMode: TaxMode,
  priceMode: PriceMode,
  /** GST state code, so IGST can be added without a schema change (TRD §6.1 rule 4). */
  placeOfSupply: z.string().regex(/^\d{2}$/, 'a two-digit GST state code'),
  lines: z.array(InvoiceLine).min(1),
  discount: OrderDiscount.nullable(),
  serviceCharge: z.strictObject({ rateBp: RateBp, taxed: z.boolean() }).nullable(),
  totals: InvoiceTotals,
});

export const PaymentCreatePayload = z.strictObject({
  invoiceId: Uuidv7,
  method: PaymentMethod,
  amount: PaiseWire.refine((amount) => amount > 0n, 'a payment is more than zero paise'),
  reference: z.string().max(100).optional(),
  receivedAt: IsoInstant,
});

export const InvoiceCancelPayload = z.strictObject({
  invoiceId: Uuidv7,
  reason: z.string().min(1).max(500),
  cancelledAt: IsoInstant,
});

/** The envelope every op shares. `entityId` is the record the op creates or upserts. */
const opBase = {
  opId: Uuidv7,
  entityId: Uuidv7,
  createdAt: IsoInstant,
  /** Per-device, strictly increasing; the server applies a batch in this order. */
  deviceSeq: z.number().int().min(1),
};

export const SyncOp = z.discriminatedUnion('type', [
  z.strictObject({ ...opBase, type: z.literal('order.upsert'), payload: OrderUpsertPayload }),
  z.strictObject({ ...opBase, type: z.literal('kot.create'), payload: KotCreatePayload }),
  z.strictObject({ ...opBase, type: z.literal('invoice.create'), payload: InvoiceCreatePayload }),
  z.strictObject({ ...opBase, type: z.literal('payment.create'), payload: PaymentCreatePayload }),
  z.strictObject({ ...opBase, type: z.literal('invoice.cancel'), payload: InvoiceCancelPayload }),
]);
/** An op in memory (paise as bigint). */
export type SyncOp = z.output<typeof SyncOp>;
/** An op as JSON on the wire (paise as strings). */
export type SyncOpWire = z.input<typeof SyncOp>;
