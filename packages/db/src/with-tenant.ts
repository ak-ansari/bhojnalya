// The only way the application touches tenant data: one transaction whose
// first statement sets the tenant and outlet context the RLS policies read
// (TRD §5.2, ADR 0005). The settings are transaction-local, so a pooled
// connection never carries one request's tenant into the next.
import { sql } from 'drizzle-orm';

import type { Db, Tx } from './client.js';

export interface TenantContext {
  tenantId: string;
  // Outlets the principal may reach. Empty hides every outlet-scoped row.
  outletIds: readonly string[];
}

export async function withTenant<T>(
  db: Db,
  context: TenantContext,
  fn: (tx: Tx) => Promise<T>,
): Promise<T> {
  assertUuid(context.tenantId, 'tenantId');
  context.outletIds.forEach((id) => {
    assertUuid(id, 'outletIds');
  });
  return db.transaction(async (tx) => {
    await tx.execute(
      sql`SELECT set_config('app.tenant_id', ${context.tenantId}, true),
                 set_config('app.outlet_ids', ${context.outletIds.join(',')}, true)`,
    );
    return fn(tx);
  });
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Checked here, not left to the ::uuid cast, so a bad id fails before a
// transaction opens and the comma-joined outlet list cannot be smuggled into.
function assertUuid(value: string, field: string): void {
  if (!UUID.test(value)) {
    throw new TypeError(`withTenant: ${field} must be a UUID, got ${JSON.stringify(value)}`);
  }
}
