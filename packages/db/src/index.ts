// Drizzle schema, SQL migrations and RLS for the API only (TRD §5).
// Tenant data is reached through withTenant; the pre-auth resolvers are the
// one narrow exception, for callers that do not know their tenant yet.
export { withTenant } from './with-tenant.js';
export type { TenantContext } from './with-tenant.js';
export { createDb } from './client.js';
export type { Db, Schema, Tx } from './client.js';
export { MIGRATIONS_FOLDER, runMigrations } from './migrate.js';
export {
  resolveDeviceToken,
  resolveLogin,
  resolveQrToken,
  resolveRefreshToken,
} from './pre-auth.js';
export type {
  ResolvedDevice,
  ResolvedLogin,
  ResolvedRefreshToken,
  ResolvedTable,
} from './pre-auth.js';
export * as schema from './schema/index.js';
export * from './schema/index.js';
