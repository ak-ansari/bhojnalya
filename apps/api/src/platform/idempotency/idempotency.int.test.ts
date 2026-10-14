import { randomUUID } from 'node:crypto';

import type { INestApplication } from '@nestjs/common';
import pg from 'pg';
import type request from 'supertest';
import type TestAgent from 'supertest/lib/agent.js';
import { afterAll, beforeAll, describe, expect, inject, it } from 'vitest';

import { createTenant, agentFor, createTestApp, principalHeader } from '../../testing/test-app.js';
import type { TenantFixture } from '../../testing/test-app.js';

let app: INestApplication;
let http: TestAgent;
let superuser: pg.Client;
let tenantA: TenantFixture;
let tenantB: TenantFixture;

beforeAll(async () => {
  const urls = inject('databaseUrls');
  superuser = new pg.Client({ connectionString: urls.superuser });
  await superuser.connect();
  tenantA = await createTenant(superuser);
  tenantB = await createTenant(superuser);
  ({ app } = await createTestApp(urls.app));
  http = agentFor(app);
});

afterAll(async () => {
  await app.close();
  await superuser.end();
});

describe('IdempotencyInterceptor', () => {
  it('replays the stored response to a retry with the same key and runs the request once', async () => {
    const key = randomUUID();
    const floor = { id: randomUUID(), name: 'Rooftop' };

    const first = await createFloor(tenantA, key, floor);
    const retry = await createFloor(tenantA, key, floor);

    expect(first.status).toBe(201);
    expect(first.headers['idempotent-replayed']).toBeUndefined();
    expect(retry.status).toBe(201);
    expect(retry.headers['idempotent-replayed']).toBe('true');
    expect(retry.body).toEqual(first.body);
    expect(await floorCount(floor.id)).toBe(1);
  });

  it('refuses the same key with a different request with 409 CONFLICT and runs nothing', async () => {
    const key = randomUUID();
    await createFloor(tenantA, key, { id: randomUUID(), name: 'Garden' });
    const other = { id: randomUUID(), name: 'Basement' };

    const res = await createFloor(tenantA, key, other);

    expect(res.status).toBe(409);
    expect(res.body).toMatchObject({ code: 'CONFLICT', details: { idempotencyKey: key } });
    expect(await floorCount(other.id)).toBe(0);
  });

  it('stores nothing for a request that failed, so its retry runs', async () => {
    const key = randomUUID();
    const floor = { id: randomUUID(), name: 'Mezzanine' };

    const failed = await http
      .post('/api/v1/probe/floors-then-fail')
      .set(principalHeader(tenantA.principal))
      .set('Idempotency-Key', key)
      .send(floor);
    expect(failed.status).toBe(500);
    const { rows } = await superuser.query('SELECT 1 FROM idempotency_keys WHERE key = $1', [key]);
    expect(rows).toEqual([]);

    const retry = await http
      .post('/api/v1/probe/floors-then-fail')
      .set(principalHeader(tenantA.principal))
      .set('Idempotency-Key', key)
      .send(floor);
    expect(retry.status).toBe(500);
    expect(retry.headers['idempotent-replayed']).toBeUndefined();
  });

  it('runs a duplicate that arrives while the first is still running once, and replays it', async () => {
    const key = randomUUID();
    const floor = { id: randomUUID(), name: 'Patio' };

    const [a, b] = await Promise.all([
      createFloor(tenantA, key, { ...floor, holdMs: 500 }),
      delay(100).then(() => createFloor(tenantA, key, { ...floor, holdMs: 500 })),
    ]);

    expect([a.status, b.status]).toEqual([201, 201]);
    expect(b.body).toEqual(a.body);
    expect(b.headers['idempotent-replayed']).toBe('true');
    expect(await floorCount(floor.id)).toBe(1);
  });

  it('keeps a key for 24 hours, then lets it run a new request', async () => {
    const key = randomUUID();
    const first = await createFloor(tenantA, key, { id: randomUUID(), name: 'Annexe' });
    const { rows } = await superuser.query<{ hours: number }>(
      'SELECT round(extract(epoch FROM expires_at - created_at) / 3600)::int AS hours FROM idempotency_keys WHERE key = $1',
      [key],
    );
    expect(rows).toEqual([{ hours: 24 }]);
    await superuser.query(
      "UPDATE idempotency_keys SET expires_at = now() - interval '1 second' WHERE key = $1",
      [key],
    );

    const later = await createFloor(tenantA, key, { id: randomUUID(), name: 'Annexe 2' });

    expect(later.status).toBe(201);
    expect(later.headers['idempotent-replayed']).toBeUndefined();
    expect(later.body).not.toEqual(first.body);
  });

  it("keeps one tenant's key apart from another tenant's identical key", async () => {
    const key = randomUUID();
    const floorA = { id: randomUUID(), name: 'Hall' };
    const floorB = { id: randomUUID(), name: 'Hall' };

    await createFloor(tenantA, key, floorA);
    const res = await createFloor(tenantB, key, floorB);

    expect(res.status).toBe(201);
    expect(res.headers['idempotent-replayed']).toBeUndefined();
    expect(await floorCount(floorB.id)).toBe(1);
  });

  it('refuses a key that is not a lowercase UUID with 400 VALIDATION_FAILED', async () => {
    const res = await http
      .post('/api/v1/probe/floors')
      .set(principalHeader(tenantA.principal))
      .set('Idempotency-Key', 'retry-1')
      .send({ id: randomUUID(), name: 'Loft' });

    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({ code: 'VALIDATION_FAILED' });
  });
});

async function createFloor(
  tenant: TenantFixture,
  key: string,
  body: { id: string; name: string; holdMs?: number },
): Promise<request.Response> {
  return http
    .post('/api/v1/probe/floors')
    .set(principalHeader(tenant.principal))
    .set('Idempotency-Key', key)
    .send(body);
}

async function floorCount(id: string): Promise<number> {
  const { rows } = await superuser.query('SELECT 1 FROM floors WHERE id = $1', [id]);
  return rows.length;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
