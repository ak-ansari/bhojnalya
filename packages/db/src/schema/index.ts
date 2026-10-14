// The Drizzle schema. Every table here with a tenant_id column is covered by
// the tenant isolation test without being named in it (TRD §5.2).
export * from './tenancy.js';
export * from './identity.js';
export * from './audit.js';
