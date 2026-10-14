// Kitchen order tickets (TRD §5.3, §8.4). Each "send to kitchen" makes one
// KOT holding only the items not sent before. A till numbers its KOTs from 1
// every business day, so two offline tills never clash (US-KDS-07); a KOT the
// server makes itself (QR, aggregator) has no device and its own series.
import { sql } from 'drizzle-orm';
import {
  check,
  date,
  foreignKey,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';

import { devices } from './identity.js';
import { orderItems, orders } from './ordering.js';
import { createdAt, updatedAt } from './tenancy.js';

// Same values as KotStatus in packages/contracts.
export const kotStatus = pgEnum('kot_status', ['new', 'preparing', 'ready']);

export const kots = pgTable(
  'kots',
  {
    id: uuid('id').primaryKey(),
    tenantId: uuid('tenant_id').notNull(),
    outletId: uuid('outlet_id').notNull(),
    orderId: uuid('order_id').notNull(),
    deviceId: uuid('device_id'),
    kotNo: integer('kot_no').notNull(),
    // In Asia/Kolkata with the outlet's day-end cutoff (ADR 0016).
    businessDate: date('business_date').notNull(),
    status: kotStatus('status').notNull().default('new'),
    preparingAt: timestamp('preparing_at', { withTimezone: true }),
    readyAt: timestamp('ready_at', { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    unique('kots_tenant_id_outlet_id_id_key').on(t.tenantId, t.outletId, t.id),
    unique('kots_device_business_date_kot_no_key')
      .on(t.outletId, t.deviceId, t.businessDate, t.kotNo)
      .nullsNotDistinct(),
    index('kots_outlet_id_status_idx').on(t.outletId, t.status),
    check('kots_kot_no_check', sql`${t.kotNo} >= 1`),
    foreignKey({
      name: 'kots_order_fk',
      columns: [t.tenantId, t.outletId, t.orderId],
      foreignColumns: [orders.tenantId, orders.outletId, orders.id],
    }),
    foreignKey({
      name: 'kots_device_fk',
      columns: [t.tenantId, t.outletId, t.deviceId],
      foreignColumns: [devices.tenantId, devices.outletId, devices.id],
    }),
  ],
);

// What the kitchen was asked to make, as it was named then. The key to the
// order item also stops a sent item from being deleted: it is voided instead.
export const kotItems = pgTable(
  'kot_items',
  {
    id: uuid('id').primaryKey(),
    tenantId: uuid('tenant_id').notNull(),
    outletId: uuid('outlet_id').notNull(),
    kotId: uuid('kot_id').notNull(),
    orderItemId: uuid('order_item_id').notNull(),
    name: text('name').notNull(),
    quantity: integer('quantity').notNull(),
    note: text('note'),
    createdAt: createdAt(),
  },
  (t) => [
    index('kot_items_kot_id_idx').on(t.kotId),
    check('kot_items_quantity_check', sql`${t.quantity} >= 1`),
    foreignKey({
      name: 'kot_items_kot_fk',
      columns: [t.tenantId, t.outletId, t.kotId],
      foreignColumns: [kots.tenantId, kots.outletId, kots.id],
    }),
    foreignKey({
      name: 'kot_items_order_item_fk',
      columns: [t.tenantId, t.outletId, t.orderItemId],
      foreignColumns: [orderItems.tenantId, orderItems.outletId, orderItems.id],
    }),
  ],
);
