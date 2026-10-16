import { createHash, randomUUID } from 'node:crypto';

import { newId } from '@bhojnalya/contracts';
import type { INestApplication } from '@nestjs/common';
import pg from 'pg';
import type TestAgent from 'supertest/lib/agent.js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { inject } from 'vitest';

import { createOwner } from '../../../testing/auth-fixtures.js';
import { agentFor, createTenant, createTestApp } from '../../../testing/test-app.js';
import type { TenantFixture } from '../../../testing/test-app.js';

/** The fields these tests read from login, register and list responses. */
interface Body {
  accessToken: string;
  device: { id: string; deviceCode: string };
  deviceToken: string;
  invoicePrefix: string;
  items: { deviceCode: string }[];
  nextCursor: string | null;
}

/** Supertest types every body as `any`; the assertions still check the shape. */
function bodyOf(res: { body: unknown }): Body {
  return res.body as Body;
}

let app: INestApplication;
let http: TestAgent;
let superuser: pg.Client;

beforeAll(async () => {
  const urls = inject('databaseUrls');
  superuser = new pg.Client({ connectionString: urls.superuser });
  await superuser.connect();
  ({ app } = await createTestApp(urls.app));
  http = agentFor(app);
});

afterAll(async () => {
  await app.close();
  await superuser.end();
});

interface SignedInOwner {
  tenant: TenantFixture;
  userId: string;
  bearer: Record<string, string>;
}

async function signedInOwner(): Promise<SignedInOwner> {
  const tenant = await createTenant(superuser);
  const owner = await createOwner(superuser, tenant);
  const res = await http
    .post('/api/v1/auth/login')
    .send({ login: owner.email, password: owner.password });
  expect(res.status).toBe(200);
  return {
    tenant,
    userId: owner.userId,
    bearer: { Authorization: `Bearer ${bodyOf(res).accessToken}` },
  };
}

function register(
  bearer: Record<string, string>,
  body: { outletId: string; role?: string; replacesDeviceId?: string; id?: string },
) {
  return http
    .post('/api/v1/devices')
    .set(bearer)
    .send({ id: body.id ?? newId(), role: body.role ?? 'pos', ...body });
}

function asDevice(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}` };
}

describe('POST /devices', () => {
  it("gives a new till the outlet's next code, a token shown once, and the outlet's invoice prefix", async () => {
    const { tenant, bearer } = await signedInOwner();
    const outletId = tenant.outletIds[0];
    const res = await register(bearer, { outletId, role: 'pos' });
    expect(res.status).toBe(201);
    expect(bodyOf(res).device).toMatchObject({ outletId, deviceCode: '01', role: 'pos' });
    expect(bodyOf(res).deviceToken).toMatch(/^bdt_[\w-]{43}$/);
    const { rows: prefix } = await superuser.query<{ invoice_prefix: string }>(
      'SELECT invoice_prefix FROM outlets WHERE id = $1',
      [outletId],
    );
    expect(bodyOf(res).invoicePrefix).toBe(prefix[0]?.invoice_prefix);
    expect(bodyOf(await register(bearer, { outletId, role: 'kds' })).device.deviceCode).toBe('02');
    // Each outlet counts on its own.
    const other = await register(bearer, { outletId: tenant.outletIds[1] });
    expect(bodyOf(other).device.deviceCode).toBe('01');
  });

  it('stores only the hash of the device token, and keeps no copy of the answer for replay', async () => {
    const { tenant, bearer } = await signedInOwner();
    const key = randomUUID();
    const res = await register(bearer, { outletId: tenant.outletIds[0] }).set(
      'Idempotency-Key',
      key,
    );
    const token = bodyOf(res).deviceToken;
    const { rows } = await superuser.query<{ token_hash: string }>(
      'SELECT token_hash FROM devices WHERE id = $1',
      [bodyOf(res).device.id],
    );
    expect(rows[0]?.token_hash).toBe(createHash('sha256').update(token).digest('hex'));
    const { rows: stored } = await superuser.query(
      'SELECT 1 FROM idempotency_keys WHERE key = $1',
      [key],
    );
    expect(stored).toEqual([]);
  });

  it('refuses a second registration with the same id with 409 CONFLICT, so no second token exists', async () => {
    const { tenant, bearer } = await signedInOwner();
    const id = newId();
    expect((await register(bearer, { outletId: tenant.outletIds[0], id })).status).toBe(201);
    const again = await register(bearer, { outletId: tenant.outletIds[0], id });
    expect(again.status).toBe(409);
    expect(again.body).toMatchObject({ code: 'CONFLICT', details: { deviceId: id } });
  });

  it('gives 20 tills registered at the same moment 20 different codes', async () => {
    const { tenant, bearer } = await signedInOwner();
    const outletId = tenant.outletIds[0];
    const responses = await Promise.all(
      Array.from({ length: 20 }, () => register(bearer, { outletId })),
    );
    expect(responses.map((r) => r.status)).toEqual(Array.from({ length: 20 }, () => 201));
    const codes = responses.map((r) => bodyOf(r).device.deviceCode).sort();
    expect(new Set(codes).size).toBe(20);
    expect(codes).toEqual(
      ['01', '02', '03', '04', '05', '06', '07', '08', '09'].concat(
        ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K'].map((c) => `0${c}`),
      ),
    );
  });

  it('refuses an outlet of another tenant with 403, and registers nothing there', async () => {
    const { bearer } = await signedInOwner();
    const other = await createTenant(superuser);
    const res = await register(bearer, { outletId: other.outletIds[0] });
    expect(res.status).toBe(403);
    const { rows } = await superuser.query('SELECT 1 FROM devices WHERE outlet_id = $1', [
      other.outletIds[0],
    ]);
    expect(rows).toEqual([]);
  });

  it('refuses a caller with no sign-in with 401, and a device token with 403', async () => {
    const { tenant, bearer } = await signedInOwner();
    const outletId = tenant.outletIds[0];
    expect((await register({}, { outletId })).status).toBe(401);
    const device = await register(bearer, { outletId });
    const res = await register(asDevice(bodyOf(device).deviceToken), { outletId });
    expect(res.status).toBe(403);
  });

  it('writes who registered the device to the audit log', async () => {
    const { tenant, bearer, userId } = await signedInOwner();
    const res = await register(bearer, { outletId: tenant.outletIds[0] });
    const { rows } = await superuser.query(
      'SELECT actor_type, actor_user_id, action FROM audit_log WHERE entity_id = $1',
      [bodyOf(res).device.id],
    );
    expect(rows).toEqual([
      { actor_type: 'user', actor_user_id: userId, action: 'device.registered' },
    ]);
  });
});

describe('a device token', () => {
  it('signs the device in for its own outlet only, as itself', async () => {
    const { tenant, bearer } = await signedInOwner();
    const outletId = tenant.outletIds[1];
    const body = bodyOf(await register(bearer, { outletId, role: 'kds' }));
    const me = await http.get('/api/v1/devices/me').set(asDevice(body.deviceToken));
    expect(me.status).toBe(200);
    expect(me.body).toMatchObject({
      device: { id: body.device.id, outletId, deviceCode: '01', role: 'kds' },
      invoicePrefix: body.invoicePrefix,
    });
    const ctx = await http.get('/api/v1/probe/context').set(asDevice(body.deviceToken));
    expect(ctx.body).toMatchObject({ tenantId: tenant.tenantId, outletIds: outletId });
  });

  it('is refused with 401 once the owner revokes the device, and the code stays taken', async () => {
    const { tenant, bearer } = await signedInOwner();
    const outletId = tenant.outletIds[0];
    const body = bodyOf(await register(bearer, { outletId }));
    const res = await http.delete(`/api/v1/devices/${body.device.id}`).set(bearer);
    expect(res.status).toBe(204);
    const me = await http.get('/api/v1/devices/me').set(asDevice(body.deviceToken));
    expect(me.status).toBe(401);
    expect(me.body).toMatchObject({ code: 'UNAUTHENTICATED' });
    expect(bodyOf(await register(bearer, { outletId })).device.deviceCode).toBe('02');
    // Revoking again changes nothing.
    expect((await http.delete(`/api/v1/devices/${body.device.id}`).set(bearer)).status).toBe(204);
  });

  it('is refused with 401 when it is not a token the server issued', async () => {
    const res = await http.get('/api/v1/devices/me').set(asDevice('bdt_made-up'));
    expect(res.status).toBe(401);
  });

  it('cannot revoke a device of another tenant: 404, and the device keeps working', async () => {
    const a = await signedInOwner();
    const b = await signedInOwner();
    const body = bodyOf(await register(b.bearer, { outletId: b.tenant.outletIds[0] }));
    const res = await http.delete(`/api/v1/devices/${body.device.id}`).set(a.bearer);
    expect(res.status).toBe(404);
    const me = await http.get('/api/v1/devices/me').set(asDevice(body.deviceToken));
    expect(me.status).toBe(200);
  });
});

describe('re-provisioning a device', () => {
  it('retires the old code for good, recording the last invoice number synced from it', async () => {
    const { tenant, bearer } = await signedInOwner();
    const outletId = tenant.outletIds[0];
    const old = await register(bearer, { outletId });
    const oldId = bodyOf(old).device.id;
    for (const [fy, no] of [
      ['2526', 'AB01/2526/000412'],
      ['2627', 'AB01/2627/000042'],
    ] as const) {
      await superuser.query(
        `INSERT INTO device_invoice_counters (tenant_id, outlet_id, device_id, fy, last_seq, last_invoice_no, invoice_count)
         VALUES ($1, $2, $3, $4, 42, $5, 42)`,
        [tenant.tenantId, outletId, oldId, fy, no],
      );
    }

    const fresh = await register(bearer, { outletId, replacesDeviceId: oldId });
    expect(fresh.status).toBe(201);
    expect(bodyOf(fresh).device.deviceCode).toBe('02');

    const { rows } = await superuser.query(
      `SELECT device_code, retired_at IS NOT NULL AS retired, revoked_at IS NOT NULL AS revoked,
              retired_last_invoice_no, replaced_by_device_id
         FROM devices WHERE id = $1`,
      [oldId],
    );
    expect(rows).toEqual([
      {
        device_code: '01',
        retired: true,
        revoked: true,
        retired_last_invoice_no: 'AB01/2627/000042',
        replaced_by_device_id: bodyOf(fresh).device.id,
      },
    ]);
    const oldToken = asDevice(bodyOf(old).deviceToken);
    expect((await http.get('/api/v1/devices/me').set(oldToken)).status).toBe(401);
    const newToken = asDevice(bodyOf(fresh).deviceToken);
    expect((await http.get('/api/v1/devices/me').set(newToken)).status).toBe(200);
    // The retired code is never handed out again.
    expect(bodyOf(await register(bearer, { outletId })).device.deviceCode).toBe('03');
    const { rows: audit } = await superuser.query(
      "SELECT after FROM audit_log WHERE entity_id = $1 AND action = 'device.retired'",
      [oldId],
    );
    expect(audit).toEqual([
      {
        after: {
          deviceCode: '01',
          lastInvoiceNo: 'AB01/2627/000042',
          replacedByDeviceId: bodyOf(fresh).device.id,
        },
      },
    ]);
  });

  it('records no invoice number for a device that never synced one', async () => {
    const { tenant, bearer } = await signedInOwner();
    const outletId = tenant.outletIds[0];
    const old = await register(bearer, { outletId });
    await register(bearer, { outletId, replacesDeviceId: bodyOf(old).device.id });
    const { rows } = await superuser.query(
      'SELECT retired_last_invoice_no FROM devices WHERE id = $1',
      [bodyOf(old).device.id],
    );
    expect(rows).toEqual([{ retired_last_invoice_no: null }]);
  });

  it('can replace a revoked device, but not one already replaced (409), nor one of another outlet (404)', async () => {
    const { tenant, bearer } = await signedInOwner();
    const [outletId, otherOutlet] = tenant.outletIds;
    const old = await register(bearer, { outletId });
    const oldId = bodyOf(old).device.id;
    await http.delete(`/api/v1/devices/${oldId}`).set(bearer);
    expect(
      (await register(bearer, { outletId: otherOutlet, replacesDeviceId: oldId })).status,
    ).toBe(404);
    expect((await register(bearer, { outletId, replacesDeviceId: oldId })).status).toBe(201);
    const twice = await register(bearer, { outletId, replacesDeviceId: oldId });
    expect(twice.status).toBe(409);
    expect(twice.body).toMatchObject({ code: 'CONFLICT' });
  });
});

describe('GET /devices', () => {
  it("lists an outlet's devices by code, retired ones included, a page at a time", async () => {
    const { tenant, bearer } = await signedInOwner();
    const outletId = tenant.outletIds[0];
    const first = await register(bearer, { outletId });
    await register(bearer, { outletId, replacesDeviceId: bodyOf(first).device.id });
    await register(bearer, { outletId });

    const page1 = await http.get('/api/v1/devices').query({ outletId, limit: 2 }).set(bearer);
    expect(page1.status).toBe(200);
    expect(bodyOf(page1).items.map((d: { deviceCode: string }) => d.deviceCode)).toEqual([
      '01',
      '02',
    ]);
    expect(bodyOf(page1).items[0]).toMatchObject({ retiredAt: expect.any(String) as unknown });
    expect(bodyOf(page1).nextCursor).toBe('02');
    expect(JSON.stringify(page1.body)).not.toContain('token');

    const page2 = await http
      .get('/api/v1/devices')
      .query({ outletId, limit: 2, cursor: '02' })
      .set(bearer);
    expect(page2.body).toMatchObject({ items: [{ deviceCode: '03' }], nextCursor: null });
  });

  it("refuses another tenant's outlet with 403", async () => {
    const { bearer } = await signedInOwner();
    const other = await createTenant(superuser);
    const res = await http
      .get('/api/v1/devices')
      .query({ outletId: other.outletIds[0] })
      .set(bearer);
    expect(res.status).toBe(403);
  });
});
