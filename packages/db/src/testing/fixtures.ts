// Realistic tenants for the integration tests, written as the superuser
// (seeding only). Each call makes a fresh tenant, so files never collide.
import { randomUUID } from 'node:crypto';

import type pg from 'pg';

export interface TenantFixture {
  tenantId: string;
  outletIds: [string, string];
  floorId: string;
  userId: string;
  email: string;
}

let prefix = 0;

export async function createTenant(superuser: pg.Client): Promise<TenantFixture> {
  const tenantId = randomUUID();
  const outletIds: [string, string] = [randomUUID(), randomUUID()];
  const floorId = randomUUID();
  const userId = randomUUID();
  const email = `owner-${tenantId}@example.test`;
  await superuser.query('INSERT INTO tenants (id, name) VALUES ($1, $2)', [tenantId, 'Chai Point']);
  for (const outletId of outletIds) {
    prefix += 1;
    await superuser.query(
      `INSERT INTO outlets (id, tenant_id, name, legal_name, address_line1, city, pincode, state_code, invoice_prefix)
       VALUES ($1, $2, 'Bandra', 'Chai Point Pvt Ltd', '1 Hill Road', 'Mumbai', '400050', '27', $3)`,
      [outletId, tenantId, String(prefix % 100).padStart(2, '0')],
    );
  }
  await superuser.query(
    "INSERT INTO floors (id, tenant_id, outlet_id, name) VALUES ($1, $2, $3, 'Ground')",
    [floorId, tenantId, outletIds[0]],
  );
  await superuser.query(
    "INSERT INTO users (id, tenant_id, name, email, password_hash) VALUES ($1, $2, 'Owner', $3, 'argon2id$x')",
    [userId, tenantId, email],
  );
  return { tenantId, outletIds, floorId, userId, email };
}
