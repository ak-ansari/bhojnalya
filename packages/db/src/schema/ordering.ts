// Ordering tables (TRD §5.3, §8.3, §10). An order item snapshots the menu
// item's name, price, tax rate and HSN when it is ordered, and keeps menu ids
// only as plain references: no foreign key, because a later menu edit or
// delete must never reach an order (ADR 0008).
import { sql } from 'drizzle-orm';
import {
  bigint,
  check,
  foreignKey,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

import { devices, users } from './identity.js';
import { createdAt, outlets, tables, updatedAt } from './tenancy.js';

// Same values as OrderChannel and OrderType in packages/contracts.
export const orderChannel = pgEnum('order_channel', ['pos', 'qr', 'swiggy', 'zomato']);
export const orderType = pgEnum('order_type', ['dine_in', 'takeaway', 'delivery']);
// pending: a QR order waiting for staff (TRD §10); open: accepted, in service;
// billed: an invoice is issued; settled: paid and the table freed.
export const orderStatus = pgEnum('order_status', [
  'pending',
  'open',
  'rejected',
  'billed',
  'settled',
  'cancelled',
]);
export const tableSessionStatus = pgEnum('table_session_status', ['open', 'closed']);

// One party at one table: the first QR scan opens it, settling closes it (TRD §10).
export const tableSessions = pgTable(
  'table_sessions',
  {
    id: uuid('id').primaryKey(),
    tenantId: uuid('tenant_id').notNull(),
    outletId: uuid('outlet_id').notNull(),
    tableId: uuid('table_id').notNull(),
    status: tableSessionStatus('status').notNull().default('open'),
    guestName: text('guest_name'),
    guestPhone: text('guest_phone'),
    openedAt: timestamp('opened_at', { withTimezone: true }).notNull().defaultNow(),
    closedAt: timestamp('closed_at', { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    unique('table_sessions_tenant_id_outlet_id_id_key').on(t.tenantId, t.outletId, t.id),
    // Later scans join the open session, so a table has at most one.
    uniqueIndex('table_sessions_one_open_per_table_key')
      .on(t.tableId)
      .where(sql`${t.status} = 'open'`),
    check(
      'table_sessions_closed_check',
      sql`(${t.status} = 'closed') = (${t.closedAt} IS NOT NULL)`,
    ),
    foreignKey({
      name: 'table_sessions_table_fk',
      columns: [t.tenantId, t.outletId, t.tableId],
      foreignColumns: [tables.tenantId, tables.outletId, tables.id],
    }),
  ],
);

export const orders = pgTable(
  'orders',
  {
    id: uuid('id').primaryKey(),
    tenantId: uuid('tenant_id').notNull(),
    outletId: uuid('outlet_id').notNull(),
    channel: orderChannel('channel').notNull(),
    type: orderType('type').notNull(),
    status: orderStatus('status').notNull(),
    tableId: uuid('table_id'),
    tableSessionId: uuid('table_session_id'),
    // The POS that took it; null for QR and aggregator orders.
    deviceId: uuid('device_id'),
    createdByUserId: uuid('created_by_user_id'),
    note: text('note'),
    rejectReason: text('reject_reason'),
    cancelReason: text('cancel_reason'),
    createdAt: createdAt(),
    // Field-level last-writer-wins between POS devices compares this (TRD §8.3).
    updatedAt: updatedAt(),
  },
  (t) => [
    unique('orders_tenant_id_outlet_id_id_key').on(t.tenantId, t.outletId, t.id),
    index('orders_outlet_id_status_idx').on(t.outletId, t.status),
    index('orders_outlet_id_updated_at_idx').on(t.outletId, t.updatedAt),
    // A void always has a reason (PRD P7).
    check(
      'orders_cancel_reason_check',
      sql`${t.status} <> 'cancelled' OR ${t.cancelReason} IS NOT NULL`,
    ),
    foreignKey({
      name: 'orders_outlet_fk',
      columns: [t.tenantId, t.outletId],
      foreignColumns: [outlets.tenantId, outlets.id],
    }),
    foreignKey({
      name: 'orders_table_fk',
      columns: [t.tenantId, t.outletId, t.tableId],
      foreignColumns: [tables.tenantId, tables.outletId, tables.id],
    }),
    foreignKey({
      name: 'orders_table_session_fk',
      columns: [t.tenantId, t.outletId, t.tableSessionId],
      foreignColumns: [tableSessions.tenantId, tableSessions.outletId, tableSessions.id],
    }),
    foreignKey({
      name: 'orders_device_fk',
      columns: [t.tenantId, t.outletId, t.deviceId],
      foreignColumns: [devices.tenantId, devices.outletId, devices.id],
    }),
    foreignKey({
      name: 'orders_created_by_fk',
      columns: [t.tenantId, t.createdByUserId],
      foreignColumns: [users.tenantId, users.id],
    }),
  ],
);

export const orderItems = pgTable(
  'order_items',
  {
    id: uuid('id').primaryKey(),
    tenantId: uuid('tenant_id').notNull(),
    outletId: uuid('outlet_id').notNull(),
    orderId: uuid('order_id').notNull(),
    menuItemId: uuid('menu_item_id'),
    name: text('name').notNull(),
    hsnSac: text('hsn_sac').notNull(),
    unitPricePaise: bigint('unit_price_paise', { mode: 'bigint' }).notNull(),
    quantity: integer('quantity').notNull(),
    taxRateBp: integer('tax_rate_bp').notNull(),
    note: text('note'),
    // An item already sent to the kitchen is voided, never deleted (PRD P7).
    voidedAt: timestamp('voided_at', { withTimezone: true }),
    voidReason: text('void_reason'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    unique('order_items_tenant_id_outlet_id_id_key').on(t.tenantId, t.outletId, t.id),
    index('order_items_order_id_idx').on(t.orderId),
    check('order_items_unit_price_paise_check', sql`${t.unitPricePaise} >= 0`),
    check('order_items_quantity_check', sql`${t.quantity} >= 1`),
    check('order_items_tax_rate_bp_check', sql`${t.taxRateBp} BETWEEN 0 AND 10000`),
    check('order_items_void_check', sql`${t.voidedAt} IS NULL OR ${t.voidReason} IS NOT NULL`),
    foreignKey({
      name: 'order_items_order_fk',
      columns: [t.tenantId, t.outletId, t.orderId],
      foreignColumns: [orders.tenantId, orders.outletId, orders.id],
    }).onDelete('cascade'),
  ],
);

export const orderItemModifiers = pgTable(
  'order_item_modifiers',
  {
    id: uuid('id').primaryKey(),
    tenantId: uuid('tenant_id').notNull(),
    outletId: uuid('outlet_id').notNull(),
    orderItemId: uuid('order_item_id').notNull(),
    modifierId: uuid('modifier_id'),
    name: text('name').notNull(),
    pricePaise: bigint('price_paise', { mode: 'bigint' }).notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    index('order_item_modifiers_order_item_id_idx').on(t.orderItemId),
    check('order_item_modifiers_price_paise_check', sql`${t.pricePaise} >= 0`),
    foreignKey({
      name: 'order_item_modifiers_order_item_fk',
      columns: [t.tenantId, t.outletId, t.orderItemId],
      foreignColumns: [orderItems.tenantId, orderItems.outletId, orderItems.id],
    }).onDelete('cascade'),
  ],
);
