// Tenancy tables: Tenant → Outlet → Floor → Table, plus the per-outlet
// subscription (TRD §5.1, §5.3; ADR 0014). Every row below the tenant carries
// tenant_id, every outlet-scoped row also carries outlet_id, and children
// reference parents by (tenant_id, id) so a row can never point across tenants:
// a foreign-key check ignores RLS, a composite key does not need it to.
import { sql } from 'drizzle-orm';
import {
  boolean,
  char,
  check,
  date,
  foreignKey,
  integer,
  pgEnum,
  pgTable,
  text,
  time,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';

export const taxMode = pgEnum('tax_mode', ['regular', 'composition', 'unregistered']);
export const priceMode = pgEnum('price_mode', ['inclusive', 'exclusive']);
// The outlet's own switch, driven by its subscription (ADR 0015).
export const outletStatus = pgEnum('outlet_status', ['active', 'suspended']);
export const subscriptionStatus = pgEnum('subscription_status', [
  'trial',
  'active',
  'overdue',
  'suspended',
]);

export const tenants = pgTable('tenants', {
  id: uuid('id').primaryKey(),
  name: text('name').notNull(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const outlets = pgTable(
  'outlets',
  {
    id: uuid('id').primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    name: text('name').notNull(),
    legalName: text('legal_name').notNull(),
    addressLine1: text('address_line1').notNull(),
    addressLine2: text('address_line2'),
    city: text('city').notNull(),
    pincode: char('pincode', { length: 6 }).notNull(),
    // GST state code, e.g. "27" for Maharashtra; also the MVP's place of supply.
    stateCode: char('state_code', { length: 2 }).notNull(),
    gstin: char('gstin', { length: 15 }),
    fssai: text('fssai'),
    taxMode: taxMode('tax_mode').notNull().default('regular'),
    priceMode: priceMode('price_mode').notNull().default('exclusive'),
    // {PP} in {PP}{DD}/{FYFY}/{NNNNNN} (TRD §7).
    invoicePrefix: char('invoice_prefix', { length: 2 }).notNull(),
    kdsAmberAfterMinutes: integer('kds_amber_after_minutes').notNull().default(10),
    kdsRedAfterMinutes: integer('kds_red_after_minutes').notNull().default(20),
    // Auto-accept for QR orders (PRD Q4).
    autoAccept: boolean('auto_accept').notNull().default(false),
    // Business day ends here in Asia/Kolkata, e.g. 04:00 (TRD §14).
    dayEndCutoff: time('day_end_cutoff').notNull().default('04:00'),
    status: outletStatus('status').notNull().default('active'),
    suspendedAt: timestamp('suspended_at', { withTimezone: true }),
    suspensionReason: text('suspension_reason'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    unique('outlets_tenant_id_id_key').on(t.tenantId, t.id),
    // Two outlets of one tenant may share a GSTIN, so their series must differ.
    unique('outlets_tenant_id_invoice_prefix_key').on(t.tenantId, t.invoicePrefix),
    check('outlets_state_code_check', sql`${t.stateCode} ~ '^[0-9]{2}$'`),
    check('outlets_invoice_prefix_check', sql`${t.invoicePrefix} ~ '^[A-Z0-9]{2}$'`),
    check(
      'outlets_kds_thresholds_check',
      sql`0 < ${t.kdsAmberAfterMinutes} AND ${t.kdsAmberAfterMinutes} < ${t.kdsRedAfterMinutes}`,
    ),
    check(
      'outlets_suspension_check',
      sql`(${t.status} = 'suspended') = (${t.suspendedAt} IS NOT NULL)`,
    ),
  ],
);

export const floors = pgTable(
  'floors',
  {
    id: uuid('id').primaryKey(),
    tenantId: uuid('tenant_id').notNull(),
    outletId: uuid('outlet_id').notNull(),
    name: text('name').notNull(),
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    unique('floors_tenant_id_outlet_id_id_key').on(t.tenantId, t.outletId, t.id),
    foreignKey({
      name: 'floors_outlet_fk',
      columns: [t.tenantId, t.outletId],
      foreignColumns: [outlets.tenantId, outlets.id],
    }),
  ],
);

export const tables = pgTable(
  'tables',
  {
    id: uuid('id').primaryKey(),
    tenantId: uuid('tenant_id').notNull(),
    outletId: uuid('outlet_id').notNull(),
    floorId: uuid('floor_id').notNull(),
    label: text('label').notNull(),
    seats: integer('seats'),
    // Unguessable token in the table's QR URL; rotating it kills the old one (TRD §10).
    qrToken: text('qr_token').notNull().unique('tables_qr_token_key'),
    qrRotatedAt: timestamp('qr_rotated_at', { withTimezone: true }),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    unique('tables_outlet_id_label_key').on(t.outletId, t.label),
    unique('tables_tenant_id_outlet_id_id_key').on(t.tenantId, t.outletId, t.id),
    foreignKey({
      name: 'tables_floor_fk',
      columns: [t.tenantId, t.outletId, t.floorId],
      foreignColumns: [floors.tenantId, floors.outletId, floors.id],
    }),
  ],
);

// Subscription status per outlet (PRD S3); payments are manual in the MVP.
export const subscriptions = pgTable(
  'subscriptions',
  {
    id: uuid('id').primaryKey(),
    tenantId: uuid('tenant_id').notNull(),
    outletId: uuid('outlet_id').notNull(),
    status: subscriptionStatus('status').notNull().default('trial'),
    plan: text('plan'),
    currentPeriodStart: date('current_period_start'),
    currentPeriodEnd: date('current_period_end'),
    notes: text('notes'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    unique('subscriptions_outlet_id_key').on(t.outletId),
    foreignKey({
      name: 'subscriptions_outlet_fk',
      columns: [t.tenantId, t.outletId],
      foreignColumns: [outlets.tenantId, outlets.id],
    }),
  ],
);

export function createdAt() {
  return timestamp('created_at', { withTimezone: true }).notNull().defaultNow();
}

export function updatedAt() {
  return timestamp('updated_at', { withTimezone: true }).notNull().defaultNow();
}
