// Aggregator tables (TRD §11, ADR 0012). The provider is the middleware the
// webhook comes from; the channel (swiggy, zomato) is on the order. An
// inbound webhook finds its outlet from the link's external store id through
// a pre-sign-in lookup (ADR 0021), stores the body as received, and a job
// turns it into an order.
import { sql } from 'drizzle-orm';
import {
  boolean,
  foreignKey,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';

import { orderChannel, orders } from './ordering.js';
import { createdAt, outlets, updatedAt } from './tenancy.js';

export const aggregatorProvider = pgEnum('aggregator_provider', ['urbanpiper']);
export const aggregatorOrderStatus = pgEnum('aggregator_order_status', [
  'placed',
  'accepted',
  'rejected',
  'food_ready',
  'dispatched',
  'delivered',
  'cancelled',
]);

// One outlet's store at one provider, switched on per outlet (PRD S4).
export const aggregatorLinks = pgTable(
  'aggregator_links',
  {
    id: uuid('id').primaryKey(),
    tenantId: uuid('tenant_id').notNull(),
    outletId: uuid('outlet_id').notNull(),
    provider: aggregatorProvider('provider').notNull(),
    extStoreId: text('ext_store_id').notNull(),
    isEnabled: boolean('is_enabled').notNull().default(false),
    storeOpen: boolean('store_open').notNull().default(true),
    // Non-secret provider settings; credentials live in the API's config.
    settings: jsonb('settings').notNull().default({}),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    unique('aggregator_links_tenant_id_outlet_id_id_key').on(t.tenantId, t.outletId, t.id),
    // The webhook names only the provider's store, so it must name one link.
    unique('aggregator_links_provider_ext_store_id_key').on(t.provider, t.extStoreId),
    unique('aggregator_links_outlet_id_provider_key').on(t.outletId, t.provider),
    foreignKey({
      name: 'aggregator_links_outlet_fk',
      columns: [t.tenantId, t.outletId],
      foreignColumns: [outlets.tenantId, outlets.id],
    }),
  ],
);

export const aggregatorOrders = pgTable(
  'aggregator_orders',
  {
    id: uuid('id').primaryKey(),
    tenantId: uuid('tenant_id').notNull(),
    outletId: uuid('outlet_id').notNull(),
    linkId: uuid('link_id').notNull(),
    provider: aggregatorProvider('provider').notNull(),
    extOrderId: text('ext_order_id').notNull(),
    channel: orderChannel('channel').notNull(),
    // Set once the job has mapped it to an internal order.
    orderId: uuid('order_id'),
    status: aggregatorOrderStatus('status').notNull().default('placed'),
    acceptBy: timestamp('accept_by', { withTimezone: true }),
    // Rider name, phone and status as the provider last sent them (PRD A3).
    rider: jsonb('rider'),
    riderEtaAt: timestamp('rider_eta_at', { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    // A webhook delivered twice makes one order (TRD §11.2).
    unique('aggregator_orders_provider_ext_order_id_key').on(t.provider, t.extOrderId),
    foreignKey({
      name: 'aggregator_orders_link_fk',
      columns: [t.tenantId, t.outletId, t.linkId],
      foreignColumns: [aggregatorLinks.tenantId, aggregatorLinks.outletId, aggregatorLinks.id],
    }),
    foreignKey({
      name: 'aggregator_orders_order_fk',
      columns: [t.tenantId, t.outletId, t.orderId],
      foreignColumns: [orders.tenantId, orders.outletId, orders.id],
    }),
  ],
);

// Every inbound webhook, kept for replay and debugging (TRD §11.2). The body
// is stored as text, byte for byte, so its signature can be checked again.
export const aggregatorEvents = pgTable(
  'aggregator_events',
  {
    id: uuid('id').primaryKey(),
    tenantId: uuid('tenant_id').notNull(),
    outletId: uuid('outlet_id').notNull(),
    linkId: uuid('link_id').notNull(),
    provider: aggregatorProvider('provider').notNull(),
    eventType: text('event_type'),
    extOrderId: text('ext_order_id'),
    headers: jsonb('headers').notNull().default({}),
    rawBody: text('raw_body').notNull(),
    receivedAt: timestamp('received_at', { withTimezone: true }).notNull().defaultNow(),
    processedAt: timestamp('processed_at', { withTimezone: true }),
    attempts: integer('attempts').notNull().default(0),
    lastError: text('last_error'),
  },
  (t) => [
    index('aggregator_events_unprocessed_idx')
      .on(t.receivedAt)
      .where(sql`${t.processedAt} IS NULL`),
    foreignKey({
      name: 'aggregator_events_link_fk',
      columns: [t.tenantId, t.outletId, t.linkId],
      foreignColumns: [aggregatorLinks.tenantId, aggregatorLinks.outletId, aggregatorLinks.id],
    }),
  ],
);
