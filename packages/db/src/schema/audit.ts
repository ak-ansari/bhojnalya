// Who / which device / when / what / before-after (TRD §5.3). Insert and select
// only. A row about the platform itself has no tenant; a row about a tenant,
// including a super admin acting on it, carries that tenant so its owner sees it.
import { index, jsonb, pgEnum, pgTable, text, uuid } from 'drizzle-orm/pg-core';

import { createdAt, tenants } from './tenancy.js';

export const actorType = pgEnum('audit_actor_type', ['user', 'device', 'platform_admin', 'system']);

export const auditLog = pgTable(
  'audit_log',
  {
    id: uuid('id').primaryKey(),
    tenantId: uuid('tenant_id').references(() => tenants.id),
    outletId: uuid('outlet_id'),
    actorType: actorType('actor_type').notNull(),
    actorUserId: uuid('actor_user_id'),
    actorDeviceId: uuid('actor_device_id'),
    actorPlatformAdminId: uuid('actor_platform_admin_id'),
    // Set on every request made with an impersonation token (TRD §13).
    impersonatedBy: uuid('impersonated_by'),
    action: text('action').notNull(),
    entityType: text('entity_type'),
    entityId: uuid('entity_id'),
    before: jsonb('before'),
    after: jsonb('after'),
    requestId: text('request_id'),
    createdAt: createdAt(),
  },
  (t) => [index('audit_log_tenant_id_created_at_idx').on(t.tenantId, t.createdAt)],
);
