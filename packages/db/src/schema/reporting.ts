// One row per outlet per business day, refreshed by a job; reports read the
// raw tables for today and this table for earlier days (TRD §5.3, §14).
// Cancelled invoices are counted apart and left out of the sales totals.
import { sql } from 'drizzle-orm';
import {
  bigint,
  date,
  foreignKey,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';

import { outlets } from './tenancy.js';

export const dailySalesRollup = pgTable(
  'daily_sales_rollup',
  {
    tenantId: uuid('tenant_id').notNull(),
    outletId: uuid('outlet_id').notNull(),
    businessDate: date('business_date').notNull(),
    invoiceCount: integer('invoice_count').notNull().default(0),
    cancelledCount: integer('cancelled_count').notNull().default(0),
    needsReviewCount: integer('needs_review_count').notNull().default(0),
    taxableValuePaise: paise('taxable_value_paise'),
    cgstPaise: paise('cgst_paise'),
    sgstPaise: paise('sgst_paise'),
    igstPaise: paise('igst_paise'),
    discountPaise: paise('discount_paise'),
    serviceChargePaise: paise('service_charge_paise'),
    roundOffPaise: paise('round_off_paise'),
    grandTotalPaise: paise('grand_total_paise'),
    cancelledTotalPaise: paise('cancelled_total_paise'),
    // Breakdowns by channel, tax rate, item and category; amounts are paise
    // strings (ADR 0018). Their shape belongs to the reports module.
    breakdown: jsonb('breakdown').notNull().default({}),
    refreshedAt: timestamp('refreshed_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({
      name: 'daily_sales_rollup_pkey',
      columns: [t.outletId, t.businessDate],
    }),
    foreignKey({
      name: 'daily_sales_rollup_outlet_fk',
      columns: [t.tenantId, t.outletId],
      foreignColumns: [outlets.tenantId, outlets.id],
    }),
  ],
);

function paise(name: string) {
  return bigint(name, { mode: 'bigint' })
    .notNull()
    .default(sql`0`);
}
