// Identity tables: owners and staff, their per-outlet roles, registered POS/KDS
// devices and refresh tokens (TRD §5.3, §13), plus the super admins, who belong
// to no tenant and are visible only to the platform_admin role (ADR 0005).
import { sql } from 'drizzle-orm';
import {
  char,
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

import { createdAt, outlets, tenants, updatedAt } from './tenancy.js';

export const userStatus = pgEnum('user_status', ['active', 'disabled']);
// The MVP grants only `owner`; the rest are Phase 2 hooks (TRD §13, ADR 0014).
export const outletRole = pgEnum('outlet_role', [
  'owner',
  'manager',
  'cashier',
  'captain',
  'kitchen',
]);
export const deviceRole = pgEnum('device_role', ['pos', 'kds']);

export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    name: text('name').notNull(),
    email: text('email').notNull(),
    phone: text('phone'),
    // Argon2id (TRD §13).
    passwordHash: text('password_hash').notNull(),
    status: userStatus('status').notNull().default('active'),
    lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    unique('users_tenant_id_id_key').on(t.tenantId, t.id),
    // Login happens before the tenant is known, so a login names one user platform-wide.
    uniqueIndex('users_email_key').on(sql`lower(${t.email})`),
    uniqueIndex('users_phone_key').on(t.phone),
  ],
);

export const userOutletRoles = pgTable(
  'user_outlet_roles',
  {
    id: uuid('id').primaryKey(),
    tenantId: uuid('tenant_id').notNull(),
    userId: uuid('user_id').notNull(),
    outletId: uuid('outlet_id').notNull(),
    role: outletRole('role').notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    unique('user_outlet_roles_user_id_outlet_id_role_key').on(t.userId, t.outletId, t.role),
    foreignKey({
      name: 'user_outlet_roles_user_fk',
      columns: [t.tenantId, t.userId],
      foreignColumns: [users.tenantId, users.id],
    }),
    foreignKey({
      name: 'user_outlet_roles_outlet_fk',
      columns: [t.tenantId, t.outletId],
      foreignColumns: [outlets.tenantId, outlets.id],
    }),
  ],
);

// A device row is never deleted: retiring keeps the row, so its code stays
// taken in that outlet and no invoice number can repeat (TRD §7, ADR 0007).
export const devices = pgTable(
  'devices',
  {
    id: uuid('id').primaryKey(),
    tenantId: uuid('tenant_id').notNull(),
    outletId: uuid('outlet_id').notNull(),
    // {DD} in the invoice number: two base36 characters.
    deviceCode: char('device_code', { length: 2 }).notNull(),
    role: deviceRole('role').notNull(),
    name: text('name'),
    tokenHash: text('token_hash').notNull(),
    registeredByUserId: uuid('registered_by_user_id'),
    lastSeenAt: timestamp('last_seen_at', { withTimezone: true }),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    retiredAt: timestamp('retired_at', { withTimezone: true }),
    // Last invoice number synced before retirement, kept for audit (TRD §7).
    retiredLastInvoiceNo: text('retired_last_invoice_no'),
    replacedByDeviceId: uuid('replaced_by_device_id'),
    createdAt: createdAt(),
  },
  (t) => [
    unique('devices_outlet_id_device_code_key').on(t.outletId, t.deviceCode),
    unique('devices_tenant_id_outlet_id_id_key').on(t.tenantId, t.outletId, t.id),
    unique('devices_token_hash_key').on(t.tokenHash),
    check('devices_device_code_check', sql`${t.deviceCode} ~ '^[0-9A-Z]{2}$'`),
    foreignKey({
      name: 'devices_outlet_fk',
      columns: [t.tenantId, t.outletId],
      foreignColumns: [outlets.tenantId, outlets.id],
    }),
    foreignKey({
      name: 'devices_registered_by_fk',
      columns: [t.tenantId, t.registeredByUserId],
      foreignColumns: [users.tenantId, users.id],
    }),
  ],
);

// Rotating refresh tokens; a family is revoked when a used token is replayed (TRD §13).
export const refreshTokens = pgTable(
  'refresh_tokens',
  {
    id: uuid('id').primaryKey(),
    tenantId: uuid('tenant_id').notNull(),
    userId: uuid('user_id').notNull(),
    familyId: uuid('family_id').notNull(),
    tokenHash: text('token_hash').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    replacedById: uuid('replaced_by_id'),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [
    unique('refresh_tokens_token_hash_key').on(t.tokenHash),
    foreignKey({
      name: 'refresh_tokens_user_fk',
      columns: [t.tenantId, t.userId],
      foreignColumns: [users.tenantId, users.id],
    }),
  ],
);

export const platformAdmins = pgTable(
  'platform_admins',
  {
    id: uuid('id').primaryKey(),
    name: text('name').notNull(),
    email: text('email').notNull(),
    passwordHash: text('password_hash').notNull(),
    totpSecret: text('totp_secret'),
    disabledAt: timestamp('disabled_at', { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex('platform_admins_email_key').on(sql`lower(${t.email})`)],
);

// One-time codes for an owner's email password reset (TRD §13). Only a keyed
// hash of the code is kept; a code is spent on use, after too many wrong
// guesses, or when a newer one is issued.
export const passwordResetCodes = pgTable(
  'password_reset_codes',
  {
    id: uuid('id').primaryKey(),
    tenantId: uuid('tenant_id').notNull(),
    userId: uuid('user_id').notNull(),
    codeHash: text('code_hash').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    failedAttempts: integer('failed_attempts').notNull().default(0),
    consumedAt: timestamp('consumed_at', { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [
    index('password_reset_codes_user_id_idx').on(t.userId, t.createdAt),
    check('password_reset_codes_failed_attempts_check', sql`${t.failedAttempts} >= 0`),
    foreignKey({
      name: 'password_reset_codes_user_fk',
      columns: [t.tenantId, t.userId],
      foreignColumns: [users.tenantId, users.id],
    }),
  ],
);
