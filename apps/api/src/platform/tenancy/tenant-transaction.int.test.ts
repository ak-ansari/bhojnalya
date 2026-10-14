import { randomUUID } from 'node:crypto';

import type { INestApplication } from '@nestjs/common';
import pg from 'pg';
import type TestAgent from 'supertest/lib/agent.js';
import { afterAll, beforeAll, describe, expect, inject, it } from 'vitest';

import { createTenant, agentFor, createTestApp, principalHeader } from '../../testing/test-app.js';
import type { TenantFixture } from '../../testing/test-app.js';

let app: INestApplication;
let logs: Record<string, unknown>[];
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
  ({ app, logs } = await createTestApp(urls.app));
  http = agentFor(app);
});

afterAll(async () => {
  await app.close();
  await superuser.end();
});

describe('TenantTransactionInterceptor', () => {
  it("runs the handler as app_user inside a transaction set to the principal's tenant and outlets", async () => {
    const res = await http.get('/api/v1/probe/context').set(principalHeader(tenantA.principal));

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      currentUser: 'app_user',
      tenantId: tenantA.tenantId,
      outletIds: tenantA.outletIds.join(','),
    });
  });

  it("shows a request its own tenant's rows and none of another tenant's", async () => {
    const insertFloor =
      'INSERT INTO floors (id, tenant_id, outlet_id, name) VALUES ($1, $2, $3, $4)';
    await superuser.query(insertFloor, [randomUUID(), tenantA.tenantId, tenantA.outletIds[0], 'A']);
    await superuser.query(insertFloor, [randomUUID(), tenantB.tenantId, tenantB.outletIds[0], 'B']);

    const res = await http.get('/api/v1/probe/context').set(principalHeader(tenantA.principal));

    expect(res.body).toMatchObject({ visibleFloors: 1 });
  });

  it('rolls back everything the request wrote when the handler throws', async () => {
    const id = randomUUID();

    const res = await http
      .post('/api/v1/probe/floors-then-fail')
      .set(principalHeader(tenantA.principal))
      .send({ id, name: 'Terrace' });

    expect(res.status).toBe(500);
    const { rows } = await superuser.query('SELECT id FROM floors WHERE id = $1', [id]);
    expect(rows).toEqual([]);
  });

  it('refuses a tenant route with 401 UNAUTHENTICATED when no principal was set', async () => {
    const res = await http.get('/api/v1/probe/context');

    expect(res.status).toBe(401);
    expect(res.body).toMatchObject({ code: 'UNAUTHENTICATED' });
  });

  it("logs the request's completion with its requestId, tenantId, outletId and deviceId", async () => {
    await http
      .get('/api/v1/probe/context')
      .set(principalHeader(tenantA.principal))
      .set('X-Request-Id', 'req-log-probe-1');

    const line = logs.find(
      (l) => l.msg === 'request completed' && l.requestId === 'req-log-probe-1',
    );
    expect(line).toMatchObject({
      requestId: 'req-log-probe-1',
      tenantId: tenantA.tenantId,
      outletId: tenantA.principal.outletId,
      deviceId: tenantA.principal.deviceId,
    });
  });
});
