// Identity rules Postgres keeps for the API: device codes are never reused,
// the audit log is append-only, and no row can point into another tenant.
import { randomUUID } from 'node:crypto';

import pg from 'pg';
import { afterAll, beforeAll, describe, expect, inject, it } from 'vitest';

import { createTenant } from './testing/fixtures.js';
import type { TenantFixture } from './testing/fixtures.js';

let superuser: pg.Client;
let app: pg.Pool;
let tenant: TenantFixture;
let other: TenantFixture;

beforeAll(async () => {
  const urls = inject('databaseUrls');
  superuser = new pg.Client({ connectionString: urls.superuser });
  await superuser.connect();
  app = new pg.Pool({ connectionString: urls.app, max: 2 });
  tenant = await createTenant(superuser);
  other = await createTenant(superuser);
});

afterAll(async () => {
  await superuser.end();
  await app.end();
});

describe('devices', () => {
  it('keeps a retired device code taken, so a new device in that outlet cannot reuse it', async () => {
    await asTenant(tenant.tenantId, tenant.outletIds, async (c) => {
      await insertDevice(c, tenant.outletIds[0], '1Z', { retired: true });
      await expect(insertDevice(c, tenant.outletIds[0], '1Z')).rejects.toThrow(
        /devices_outlet_id_device_code_key/,
      );
    });
  });

  it('allows the same code in another outlet, whose invoice prefix differs', async () => {
    await asTenant(tenant.tenantId, tenant.outletIds, async (c) => {
      await insertDevice(c, tenant.outletIds[0], '2Y');
      await expect(insertDevice(c, tenant.outletIds[1], '2Y')).resolves.toBeUndefined();
    });
  });

  it('refuses app_user a delete, so a device row and its code outlive retirement', async () => {
    await asTenant(tenant.tenantId, tenant.outletIds, async (c) => {
      await expect(c.query('DELETE FROM devices')).rejects.toThrow(/permission denied/);
    });
  });

  it('accepts only two upper-case base36 characters as a code', async () => {
    await asTenant(tenant.tenantId, tenant.outletIds, async (c) => {
      await expect(insertDevice(c, tenant.outletIds[0], '0a')).rejects.toThrow(
        /devices_device_code_check/,
      );
    });
  });
});

describe('audit_log', () => {
  it('lets app_user insert and read, never change or remove', async () => {
    await asTenant(tenant.tenantId, tenant.outletIds, async (c) => {
      await c.query(
        "INSERT INTO audit_log (id, tenant_id, actor_type, action) VALUES ($1, $2, 'user', 'device.registered')",
        [randomUUID(), tenant.tenantId],
      );
      await expect(query(c, "UPDATE audit_log SET action = 'x'")).rejects.toThrow(
        /permission denied/,
      );
      await expect(query(c, 'DELETE FROM audit_log')).rejects.toThrow(/permission denied/);
    });
  });
});

describe('cross-tenant references', () => {
  it("refuses a row of one tenant that points at another tenant's outlet, even when the context names it", async () => {
    // Tenant A's id with tenant B's outlet passes both policies; the composite key stops it.
    await asTenant(tenant.tenantId, [other.outletIds[0]], async (c) => {
      await expect(
        c.query(
          "INSERT INTO floors (id, tenant_id, outlet_id, name) VALUES ($1, $2, $3, 'Stolen')",
          [randomUUID(), tenant.tenantId, other.outletIds[0]],
        ),
      ).rejects.toThrow(/floors_outlet_fk/);
    });
  });
});

// A transaction as app_user with the tenant context set; always rolled back.
async function asTenant(
  tenantId: string,
  outletIds: readonly string[],
  fn: (c: pg.PoolClient) => Promise<void>,
): Promise<void> {
  const c = await app.connect();
  try {
    await c.query('BEGIN');
    await c.query(
      "SELECT set_config('app.tenant_id', $1, true), set_config('app.outlet_ids', $2, true)",
      [tenantId, outletIds.join(',')],
    );
    await fn(c);
  } finally {
    await c.query('ROLLBACK');
    c.release();
  }
}

function insertDevice(
  c: pg.PoolClient,
  outletId: string,
  code: string,
  { retired = false } = {},
): Promise<undefined> {
  return query(
    c,
    `INSERT INTO devices (id, tenant_id, outlet_id, device_code, role, token_hash, retired_at)
     VALUES ($1, $2, $3, $4, 'pos', $5, $6)`,
    [
      randomUUID(),
      tenant.tenantId,
      outletId,
      code,
      `hash-${randomUUID()}`,
      retired ? new Date() : null,
    ],
  );
}

// Each statement in its own savepoint, so an expected refusal leaves the
// transaction usable for the next one.
async function query(c: pg.PoolClient, text: string, values: unknown[] = []): Promise<undefined> {
  await c.query('SAVEPOINT stmt');
  try {
    await c.query(text, values);
    await c.query('RELEASE SAVEPOINT stmt');
  } catch (error) {
    await c.query('ROLLBACK TO SAVEPOINT stmt');
    throw error;
  }
  return undefined;
}
