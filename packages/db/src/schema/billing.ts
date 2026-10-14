// Billing tables (TRD §5.3, §6, §7). Append-only: the application may insert
// and read, never update or delete (ADR 0008). A cancellation is its own row,
// and an invoice's status is derived by the invoices_with_status view. Every
// line snapshots what was sold. Money is bigint paise, rates basis points.
import { sql } from 'drizzle-orm';
import {
  bigint,
  boolean,
  char,
  check,
  date,
  foreignKey,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  pgView,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';

import { devices, users } from './identity.js';
import { createdAt, priceMode, taxMode } from './tenancy.js';

// Same values as PaymentMethod in packages/contracts.
export const paymentMethod = pgEnum('payment_method', ['cash', 'upi', 'card', 'other']);
export const discountKind = pgEnum('discount_kind', ['flat', 'percent']);
export const invoiceStatus = pgEnum('invoice_status', ['issued', 'cancelled']);

export const invoices = pgTable(
  'invoices',
  {
    id: uuid('id').primaryKey(),
    tenantId: uuid('tenant_id').notNull(),
    outletId: uuid('outlet_id').notNull(),
    // A plain reference: an invoice synced from a till is stored even if its
    // order never arrived, because synced data is never dropped (TRD §8.3).
    orderId: uuid('order_id').notNull(),
    // The device whose series issued the number (ADR 0007).
    deviceId: uuid('device_id').notNull(),
    // {PP}{DD}/{FYFY}/{NNNNNN}; the format is checked where the invoice is made.
    invoiceNo: text('invoice_no').notNull(),
    // FYFY, e.g. "2627" for FY 2026-27, read in IST (ADR 0016).
    fy: char('fy', { length: 4 }).notNull(),
    issuedAt: timestamp('issued_at', { withTimezone: true }).notNull(),
    // In Asia/Kolkata with the outlet's day-end cutoff; reports group by it.
    businessDate: date('business_date').notNull(),
    taxMode: taxMode('tax_mode').notNull(),
    priceMode: priceMode('price_mode').notNull(),
    // GST state code; the MVP always sets the outlet's own state (ADR 0014).
    placeOfSupply: char('place_of_supply', { length: 2 }).notNull(),
    discountKind: discountKind('discount_kind'),
    // The flat amount is discount_paise; a percent discount keeps its rate here.
    discountRateBp: integer('discount_rate_bp'),
    serviceChargeRateBp: integer('service_charge_rate_bp'),
    serviceChargeTaxed: boolean('service_charge_taxed'),
    // Totals as issued on the device (ADR 0004).
    taxableValuePaise: bigint('taxable_value_paise', { mode: 'bigint' }).notNull(),
    cgstPaise: bigint('cgst_paise', { mode: 'bigint' }).notNull(),
    sgstPaise: bigint('sgst_paise', { mode: 'bigint' }).notNull(),
    // Zero in the MVP: every supply is intra-state.
    igstPaise: bigint('igst_paise', { mode: 'bigint' })
      .notNull()
      .default(sql`0`),
    discountPaise: bigint('discount_paise', { mode: 'bigint' }).notNull(),
    serviceChargePaise: bigint('service_charge_paise', { mode: 'bigint' }).notNull(),
    roundOffPaise: bigint('round_off_paise', { mode: 'bigint' }).notNull(),
    grandTotalPaise: bigint('grand_total_paise', { mode: 'bigint' }).notNull(),
    // Set when the server's recalculation disagrees, or the outlet was
    // suspended when it was issued (ADR 0004, ADR 0015). Never cleared here.
    needsReview: boolean('needs_review').notNull().default(false),
    // Why it needs review, e.g. the server's own totals.
    reviewDetails: jsonb('review_details'),
    createdByUserId: uuid('created_by_user_id'),
    // When the server stored it, which may be long after issued_at.
    createdAt: createdAt(),
  },
  (t) => [
    unique('invoices_outlet_id_invoice_no_key').on(t.outletId, t.invoiceNo),
    unique('invoices_tenant_id_outlet_id_id_key').on(t.tenantId, t.outletId, t.id),
    index('invoices_outlet_id_business_date_idx').on(t.outletId, t.businessDate),
    index('invoices_outlet_id_needs_review_idx')
      .on(t.outletId)
      .where(sql`${t.needsReview}`),
    // GST allows at most 16 characters (TRD §7).
    check('invoices_invoice_no_length_check', sql`char_length(${t.invoiceNo}) <= 16`),
    check('invoices_fy_check', sql`${t.fy} ~ '^[0-9]{4}$'`),
    check('invoices_place_of_supply_check', sql`${t.placeOfSupply} ~ '^[0-9]{2}$'`),
    check(
      'invoices_amounts_check',
      sql`${t.taxableValuePaise} >= 0 AND ${t.cgstPaise} >= 0 AND ${t.sgstPaise} >= 0
        AND ${t.igstPaise} >= 0 AND ${t.discountPaise} >= 0 AND ${t.serviceChargePaise} >= 0
        AND ${t.grandTotalPaise} >= 0`,
    ),
    foreignKey({
      name: 'invoices_device_fk',
      columns: [t.tenantId, t.outletId, t.deviceId],
      foreignColumns: [devices.tenantId, devices.outletId, devices.id],
    }),
    foreignKey({
      name: 'invoices_created_by_fk',
      columns: [t.tenantId, t.createdByUserId],
      foreignColumns: [users.tenantId, users.id],
    }),
  ],
);

export const invoiceLines = pgTable(
  'invoice_lines',
  {
    id: uuid('id').primaryKey(),
    tenantId: uuid('tenant_id').notNull(),
    outletId: uuid('outlet_id').notNull(),
    invoiceId: uuid('invoice_id').notNull(),
    lineNo: integer('line_no').notNull(),
    orderItemId: uuid('order_item_id'),
    menuItemId: uuid('menu_item_id'),
    name: text('name').notNull(),
    hsnSac: text('hsn_sac').notNull(),
    unitPricePaise: bigint('unit_price_paise', { mode: 'bigint' }).notNull(),
    quantity: integer('quantity').notNull(),
    taxRateBp: integer('tax_rate_bp').notNull(),
    // [{ modifierId, name, price }] with price as a paise string (ADR 0018).
    modifiers: jsonb('modifiers').notNull().default([]),
    // The line's share of the order discount, then its tax (TRD §6.1).
    discountPaise: bigint('discount_paise', { mode: 'bigint' }).notNull(),
    taxableValuePaise: bigint('taxable_value_paise', { mode: 'bigint' }).notNull(),
    cgstPaise: bigint('cgst_paise', { mode: 'bigint' }).notNull(),
    sgstPaise: bigint('sgst_paise', { mode: 'bigint' }).notNull(),
    igstPaise: bigint('igst_paise', { mode: 'bigint' })
      .notNull()
      .default(sql`0`),
    createdAt: createdAt(),
  },
  (t) => [
    unique('invoice_lines_invoice_id_line_no_key').on(t.invoiceId, t.lineNo),
    check('invoice_lines_quantity_check', sql`${t.quantity} >= 1`),
    check('invoice_lines_tax_rate_bp_check', sql`${t.taxRateBp} BETWEEN 0 AND 10000`),
    check(
      'invoice_lines_amounts_check',
      sql`${t.unitPricePaise} >= 0 AND ${t.discountPaise} >= 0 AND ${t.taxableValuePaise} >= 0
        AND ${t.cgstPaise} >= 0 AND ${t.sgstPaise} >= 0 AND ${t.igstPaise} >= 0`,
    ),
    foreignKey({
      name: 'invoice_lines_invoice_fk',
      columns: [t.tenantId, t.outletId, t.invoiceId],
      foreignColumns: [invoices.tenantId, invoices.outletId, invoices.id],
    }),
  ],
);

// The invoice's tax summary, one row per rate (TRD §6.1 rule 3).
export const invoiceTaxLines = pgTable(
  'invoice_tax_lines',
  {
    id: uuid('id').primaryKey(),
    tenantId: uuid('tenant_id').notNull(),
    outletId: uuid('outlet_id').notNull(),
    invoiceId: uuid('invoice_id').notNull(),
    taxRateBp: integer('tax_rate_bp').notNull(),
    taxableValuePaise: bigint('taxable_value_paise', { mode: 'bigint' }).notNull(),
    cgstPaise: bigint('cgst_paise', { mode: 'bigint' }).notNull(),
    sgstPaise: bigint('sgst_paise', { mode: 'bigint' }).notNull(),
    igstPaise: bigint('igst_paise', { mode: 'bigint' })
      .notNull()
      .default(sql`0`),
    createdAt: createdAt(),
  },
  (t) => [
    unique('invoice_tax_lines_invoice_id_tax_rate_bp_key').on(t.invoiceId, t.taxRateBp),
    check('invoice_tax_lines_tax_rate_bp_check', sql`${t.taxRateBp} BETWEEN 0 AND 10000`),
    check(
      'invoice_tax_lines_amounts_check',
      sql`${t.taxableValuePaise} >= 0 AND ${t.cgstPaise} >= 0 AND ${t.sgstPaise} >= 0 AND ${t.igstPaise} >= 0`,
    ),
    foreignKey({
      name: 'invoice_tax_lines_invoice_fk',
      columns: [t.tenantId, t.outletId, t.invoiceId],
      foreignColumns: [invoices.tenantId, invoices.outletId, invoices.id],
    }),
  ],
);

// Recorded, never processed: the platform takes no money (PRD P6).
export const payments = pgTable(
  'payments',
  {
    id: uuid('id').primaryKey(),
    tenantId: uuid('tenant_id').notNull(),
    outletId: uuid('outlet_id').notNull(),
    invoiceId: uuid('invoice_id').notNull(),
    method: paymentMethod('method').notNull(),
    amountPaise: bigint('amount_paise', { mode: 'bigint' }).notNull(),
    reference: text('reference'),
    receivedAt: timestamp('received_at', { withTimezone: true }).notNull(),
    deviceId: uuid('device_id'),
    createdByUserId: uuid('created_by_user_id'),
    createdAt: createdAt(),
  },
  (t) => [
    index('payments_invoice_id_idx').on(t.invoiceId),
    check('payments_amount_paise_check', sql`${t.amountPaise} > 0`),
    foreignKey({
      name: 'payments_invoice_fk',
      columns: [t.tenantId, t.outletId, t.invoiceId],
      foreignColumns: [invoices.tenantId, invoices.outletId, invoices.id],
    }),
    foreignKey({
      name: 'payments_device_fk',
      columns: [t.tenantId, t.outletId, t.deviceId],
      foreignColumns: [devices.tenantId, devices.outletId, devices.id],
    }),
    foreignKey({
      name: 'payments_created_by_fk',
      columns: [t.tenantId, t.createdByUserId],
      foreignColumns: [users.tenantId, users.id],
    }),
  ],
);

// A cancelled invoice keeps its row and its number; this row says why (PRD G4).
export const invoiceCancellations = pgTable(
  'invoice_cancellations',
  {
    id: uuid('id').primaryKey(),
    tenantId: uuid('tenant_id').notNull(),
    outletId: uuid('outlet_id').notNull(),
    invoiceId: uuid('invoice_id').notNull(),
    reason: text('reason').notNull(),
    cancelledAt: timestamp('cancelled_at', { withTimezone: true }).notNull(),
    deviceId: uuid('device_id'),
    cancelledByUserId: uuid('cancelled_by_user_id'),
    createdAt: createdAt(),
  },
  (t) => [
    unique('invoice_cancellations_invoice_id_key').on(t.invoiceId),
    check('invoice_cancellations_reason_check', sql`char_length(${t.reason}) > 0`),
    foreignKey({
      name: 'invoice_cancellations_invoice_fk',
      columns: [t.tenantId, t.outletId, t.invoiceId],
      foreignColumns: [invoices.tenantId, invoices.outletId, invoices.id],
    }),
    foreignKey({
      name: 'invoice_cancellations_device_fk',
      columns: [t.tenantId, t.outletId, t.deviceId],
      foreignColumns: [devices.tenantId, devices.outletId, devices.id],
    }),
    foreignKey({
      name: 'invoice_cancellations_cancelled_by_fk',
      columns: [t.tenantId, t.cancelledByUserId],
      foreignColumns: [users.tenantId, users.id],
    }),
  ],
);

// Every invoice with its derived status and what has been paid against it.
// Created by hand in the migration with security_invoker, so it reads the
// tables under the caller's own RLS context and grants.
export const invoicesWithStatus = pgView('invoices_with_status', {
  id: uuid('id').notNull(),
  tenantId: uuid('tenant_id').notNull(),
  outletId: uuid('outlet_id').notNull(),
  orderId: uuid('order_id').notNull(),
  deviceId: uuid('device_id').notNull(),
  invoiceNo: text('invoice_no').notNull(),
  fy: char('fy', { length: 4 }).notNull(),
  issuedAt: timestamp('issued_at', { withTimezone: true }).notNull(),
  businessDate: date('business_date').notNull(),
  grandTotalPaise: bigint('grand_total_paise', { mode: 'bigint' }).notNull(),
  needsReview: boolean('needs_review').notNull(),
  status: invoiceStatus('status').notNull(),
  cancelledAt: timestamp('cancelled_at', { withTimezone: true }),
  cancellationReason: text('cancellation_reason'),
  paidPaise: bigint('paid_paise', { mode: 'bigint' }).notNull(),
}).existing();
