import { randomUUID } from 'node:crypto';

import pg from 'pg';
import { afterAll, beforeAll, describe, expect, inject, it } from 'vitest';

import { createDb } from './client.js';
import type { Db } from './client.js';
import {
  resolveDeviceToken,
  resolveLogin,
  resolveQrToken,
  resolveRefreshToken,
} from './pre-auth.js';
import { createTenant } from './testing/fixtures.js';
import type { TenantFixture } from './testing/fixtures.js';

let superuser: pg.Client;
let pool: pg.Pool;
let db: Db;
let tenant: TenantFixture;
const ids = { device: randomUUID(), refresh: randomUUID(), table: randomUUID() };
const secrets = {
  deviceHash: `device-hash-${randomUUID()}`,
  refreshHash: `refresh-hash-${randomUUID()}`,
  qrToken: `qr-${randomUUID()}`,
  phone: `+9198${String(Date.now()).slice(-8)}`,
};

beforeAll(async () => {
  const urls = inject('databaseUrls');
  superuser = new pg.Client({ connectionString: urls.superuser });
  await superuser.connect();
  pool = new pg.Pool({ connectionString: urls.app, max: 2 });
  db = createDb(pool);

  // A second tenant first, so a resolver that ignored its argument would be caught.
  await createTenant(superuser);
  tenant = await createTenant(superuser);
  const [outletId] = tenant.outletIds;
  await superuser.query('UPDATE users SET phone = $1 WHERE id = $2', [
    secrets.phone,
    tenant.userId,
  ]);
  await superuser.query(
    "INSERT INTO devices (id, tenant_id, outlet_id, device_code, role, token_hash) VALUES ($1, $2, $3, '0A', 'pos', $4)",
    [ids.device, tenant.tenantId, outletId, secrets.deviceHash],
  );
  await superuser.query(
    "INSERT INTO refresh_tokens (id, tenant_id, user_id, family_id, token_hash, expires_at) VALUES ($1, $2, $3, $4, $5, now() + interval '30 days')",
    [ids.refresh, tenant.tenantId, tenant.userId, randomUUID(), secrets.refreshHash],
  );
  await superuser.query(
    "INSERT INTO tables (id, tenant_id, outlet_id, floor_id, label, qr_token) VALUES ($1, $2, $3, $4, 'T1', $5)",
    [ids.table, tenant.tenantId, outletId, tenant.floorId, secrets.qrToken],
  );
});

afterAll(async () => {
  await superuser.end();
  await pool.end();
});

describe('pre-auth resolvers', () => {
  it('finds the tenant of a login by email in any case, or by phone, with no context set', async () => {
    const expected = { tenantId: tenant.tenantId, userId: tenant.userId };
    expect(await resolveLogin(db, tenant.email.toUpperCase())).toEqual(expected);
    expect(await resolveLogin(db, secrets.phone)).toEqual(expected);
    expect(await resolveLogin(db, 'nobody@example.test')).toBeNull();
  });

  it('finds the tenant and outlet of a device token hash', async () => {
    expect(await resolveDeviceToken(db, secrets.deviceHash)).toEqual({
      tenantId: tenant.tenantId,
      outletId: tenant.outletIds[0],
      deviceId: ids.device,
    });
    expect(await resolveDeviceToken(db, 'unknown')).toBeNull();
  });

  it('finds the tenant and user of a refresh token hash', async () => {
    expect(await resolveRefreshToken(db, secrets.refreshHash)).toEqual({
      tenantId: tenant.tenantId,
      userId: tenant.userId,
      refreshTokenId: ids.refresh,
    });
    expect(await resolveRefreshToken(db, 'unknown')).toBeNull();
  });

  it('finds the tenant, outlet and table of a QR token', async () => {
    expect(await resolveQrToken(db, secrets.qrToken)).toEqual({
      tenantId: tenant.tenantId,
      outletId: tenant.outletIds[0],
      tableId: ids.table,
    });
    expect(await resolveQrToken(db, 'unknown')).toBeNull();
  });

  it('leaves app_user unable to read across tenants by switching the lookup setting on itself', async () => {
    const c = await pool.connect();
    try {
      await c.query('BEGIN');
      await c.query("SELECT set_config('app.pre_auth_lookup', 'on', true)");
      for (const table of ['users', 'devices', 'refresh_tokens', 'tables']) {
        const { rows } = await c.query<{ count: string }>(`SELECT count(*) FROM ${table}`);
        expect({ table, count: rows[0]?.count }).toEqual({ table, count: '0' });
      }
    } finally {
      await c.query('ROLLBACK');
      c.release();
    }
  });

  it('leaves no lookup switched on after a resolver returns', async () => {
    const c = await pool.connect();
    try {
      await c.query('BEGIN');
      await c.query('SELECT * FROM app.resolve_login($1)', [tenant.email]);
      const { rows } = await c.query<{ value: string | null }>(
        "SELECT current_setting('app.pre_auth_lookup', true) AS value",
      );
      expect(rows[0]?.value).toBe('off');
    } finally {
      await c.query('ROLLBACK');
      c.release();
    }
  });

  it('denies app_user the helpers that create or loosen policies', async () => {
    await expect(pool.query("SELECT app.enable_tenant_rls('users')")).rejects.toThrow(
      /permission denied/,
    );
    await expect(pool.query("SELECT app.allow_pre_auth_lookup('users')")).rejects.toThrow(
      /permission denied/,
    );
  });
});
