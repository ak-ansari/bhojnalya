// Sync bookkeeping (TRD §7, §8.3). sync_ops records every op the server has
// applied, so a replayed op is acked without being applied twice; it is
// insert-only. device_invoice_counters tracks each device's series per
// financial year, so a missing number shows up as a gap.
import { sql } from 'drizzle-orm';
import {
  bigint,
  char,
  check,
  foreignKey,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';

import { devices } from './identity.js';

// Same values as SYNC_OP_TYPES in packages/contracts.
export const syncOpType = pgEnum('sync_op_type', [
  'order.upsert',
  'kot.create',
  'invoice.create',
  'payment.create',
  'invoice.cancel',
]);

export const syncOps = pgTable(
  'sync_ops',
  {
    opId: uuid('op_id').primaryKey(),
    tenantId: uuid('tenant_id').notNull(),
    outletId: uuid('outlet_id').notNull(),
    deviceId: uuid('device_id').notNull(),
    deviceSeq: bigint('device_seq', { mode: 'bigint' }).notNull(),
    type: syncOpType('type').notNull(),
    entityId: uuid('entity_id').notNull(),
    // The op as the device sent it, kept so nothing synced is ever lost.
    payload: jsonb('payload').notNull(),
    // The op's createdAt on the device.
    opCreatedAt: timestamp('op_created_at', { withTimezone: true }).notNull(),
    appliedAt: timestamp('applied_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique('sync_ops_device_id_device_seq_key').on(t.deviceId, t.deviceSeq),
    check('sync_ops_device_seq_check', sql`${t.deviceSeq} >= 1`),
    foreignKey({
      name: 'sync_ops_device_fk',
      columns: [t.tenantId, t.outletId, t.deviceId],
      foreignColumns: [devices.tenantId, devices.outletId, devices.id],
    }),
  ],
);

export const deviceInvoiceCounters = pgTable(
  'device_invoice_counters',
  {
    tenantId: uuid('tenant_id').notNull(),
    outletId: uuid('outlet_id').notNull(),
    deviceId: uuid('device_id').notNull(),
    fy: char('fy', { length: 4 }).notNull(),
    // Highest NNNNNN synced so far in this year.
    lastSeq: integer('last_seq').notNull().default(0),
    lastInvoiceNo: text('last_invoice_no'),
    // Invoices synced in this year: fewer than last_seq means a gap.
    invoiceCount: integer('invoice_count').notNull().default(0),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ name: 'device_invoice_counters_pkey', columns: [t.deviceId, t.fy] }),
    check('device_invoice_counters_fy_check', sql`${t.fy} ~ '^[0-9]{4}$'`),
    check(
      'device_invoice_counters_count_check',
      sql`0 <= ${t.invoiceCount} AND ${t.invoiceCount} <= ${t.lastSeq} AND ${t.lastSeq} <= 999999`,
    ),
    foreignKey({
      name: 'device_invoice_counters_device_fk',
      columns: [t.tenantId, t.outletId, t.deviceId],
      foreignColumns: [devices.tenantId, devices.outletId, devices.id],
    }),
  ],
);
