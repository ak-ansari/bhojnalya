// Stored results of mutating requests, keyed by the client's Idempotency-Key,
// so a retried request gets the first answer instead of running twice (TRD §14,
// ADR 0009). A row is written in the same transaction as the request's own
// writes, so it exists exactly when they do.
import {
  index,
  integer,
  json,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';

import { createdAt, tenants } from './tenancy.js';

export const idempotencyKeys = pgTable(
  'idempotency_keys',
  {
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    key: uuid('key').notNull(),
    // SHA-256 of method, path and body: the same key with another request is refused.
    requestHash: text('request_hash').notNull(),
    method: text('method').notNull(),
    path: text('path').notNull(),
    // Null only inside the transaction that claimed the key; nobody else sees that.
    statusCode: integer('status_code'),
    // `json`, not `jsonb`, so a replay returns the body exactly as first sent.
    responseBody: json('response_body'),
    createdAt: createdAt(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  },
  (t) => [
    primaryKey({ name: 'idempotency_keys_pkey', columns: [t.tenantId, t.key] }),
    index('idempotency_keys_expires_at_idx').on(t.expiresAt),
  ],
);
