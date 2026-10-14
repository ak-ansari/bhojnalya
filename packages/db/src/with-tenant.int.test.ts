import { randomUUID } from 'node:crypto';

import { eq, sql } from 'drizzle-orm';
import pg from 'pg';
import { afterAll, beforeAll, describe, expect, inject, it } from 'vitest';

import { createDb } from './client.js';
import type { Db } from './client.js';
import { floors } from './schema/index.js';
import { createTenant } from './testing/fixtures.js';
import type { TenantFixture } from './testing/fixtures.js';
import { withTenant } from './with-tenant.js';

let superuser: pg.Client;
// One connection, so every call below reuses the same session.
let pool: pg.Pool;
let db: Db;
let tenant: TenantFixture;

beforeAll(async () => {
  const urls = inject('databaseUrls');
  superuser = new pg.Client({ connectionString: urls.superuser });
  await superuser.connect();
  pool = new pg.Pool({ connectionString: urls.app, max: 1 });
  db = createDb(pool);
  tenant = await createTenant(superuser);
});

afterAll(async () => {
  await superuser.end();
  await pool.end();
});

describe('withTenant', () => {
  it('sets the tenant and outlets for its transaction and for nothing after it', async () => {
    const inside = await withTenant(
      db,
      { tenantId: tenant.tenantId, outletIds: tenant.outletIds },
      (tx) => settings(tx),
    );
    expect(inside).toEqual({
      tenant_id: tenant.tenantId,
      outlet_ids: tenant.outletIds.join(','),
    });

    const after = await settings(db);
    expect(after.tenant_id ?? '').toBe('');
    expect(after.outlet_ids ?? '').toBe('');
  });

  it('runs as app_user, whose reads the context then limits to the tenant', async () => {
    const other = await createTenant(superuser);
    const visible = await withTenant(
      db,
      { tenantId: tenant.tenantId, outletIds: tenant.outletIds },
      (tx) => tx.select({ id: floors.id, tenantId: floors.tenantId }).from(floors),
    );
    expect(visible).toEqual([{ id: tenant.floorId, tenantId: tenant.tenantId }]);
    expect(visible.map((f) => f.id)).not.toContain(other.floorId);
  });

  it('commits what the callback writes, and rolls all of it back when the callback throws', async () => {
    const ctx = { tenantId: tenant.tenantId, outletIds: tenant.outletIds };
    const kept = randomUUID();
    const dropped = randomUUID();

    await withTenant(db, ctx, async (tx) => {
      await tx.insert(floors).values({
        id: kept,
        tenantId: tenant.tenantId,
        outletId: tenant.outletIds[0],
        name: 'Terrace',
      });
    });
    await expect(
      withTenant(db, ctx, async (tx) => {
        await tx.insert(floors).values({
          id: dropped,
          tenantId: tenant.tenantId,
          outletId: tenant.outletIds[0],
          name: 'Roof',
        });
        throw new Error('use case failed');
      }),
    ).rejects.toThrow('use case failed');

    const found = await withTenant(db, ctx, (tx) =>
      tx.select({ id: floors.id }).from(floors).where(eq(floors.tenantId, tenant.tenantId)),
    );
    expect(found.map((f) => f.id)).toContain(kept);
    expect(found.map((f) => f.id)).not.toContain(dropped);
  });
});

async function settings(
  handle: Pick<Db, 'execute'>,
): Promise<{ tenant_id: string | null; outlet_ids: string | null }> {
  const { rows } = await handle.execute<{ tenant_id: string | null; outlet_ids: string | null }>(
    sql`SELECT current_setting('app.tenant_id', true) AS tenant_id,
               current_setting('app.outlet_ids', true) AS outlet_ids`,
  );
  const row = rows[0];
  if (!row) throw new Error('no row');
  return row;
}
