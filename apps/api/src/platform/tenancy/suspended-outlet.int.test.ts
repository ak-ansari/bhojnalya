import { randomUUID } from 'node:crypto';

import type { INestApplication } from '@nestjs/common';
import pg from 'pg';
import type TestAgent from 'supertest/lib/agent.js';
import { afterAll, beforeAll, describe, expect, inject, it } from 'vitest';

import {
  agentFor,
  createTenant,
  createTestApp,
  principalHeader,
  suspendOutlet,
} from '../../testing/test-app.js';
import type { TenantFixture } from '../../testing/test-app.js';

let app: INestApplication;
let http: TestAgent;
let superuser: pg.Client;
let suspended: TenantFixture;
let active: TenantFixture;

beforeAll(async () => {
  const urls = inject('databaseUrls');
  superuser = new pg.Client({ connectionString: urls.superuser });
  await superuser.connect();
  suspended = await createTenant(superuser);
  active = await createTenant(superuser);
  await suspendOutlet(superuser, suspended.outletIds[0]);
  ({ app } = await createTestApp(urls.app));
  http = agentFor(app);
});

afterAll(async () => {
  await app.close();
  await superuser.end();
});

describe('SuspendedOutletInterceptor', () => {
  it('refuses a change for a suspended outlet with 402 OUTLET_SUSPENDED and writes nothing', async () => {
    const id = randomUUID();

    const res = await http
      .post('/api/v1/probe/floors')
      .set(principalHeader(suspended.principal))
      .send({ id, name: 'Terrace' });

    expect(res.status).toBe(402);
    expect(res.body).toMatchObject({
      code: 'OUTLET_SUSPENDED',
      details: { outletId: suspended.outletIds[0] },
    });
    const { rows } = await superuser.query('SELECT 1 FROM floors WHERE id = $1', [id]);
    expect(rows).toEqual([]);
  });

  it('still answers reads for a suspended outlet', async () => {
    const res = await http.get('/api/v1/probe/context').set(principalHeader(suspended.principal));

    expect(res.status).toBe(200);
  });

  it('still accepts record-keeping a route marks as allowed while suspended', async () => {
    const res = await http
      .post('/api/v1/probe/record-keeping')
      .set(principalHeader(suspended.principal));

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ accepted: true });
  });

  it("accepts changes for the same tenant's other, active outlet", async () => {
    const res = await http
      .post('/api/v1/probe/floors')
      .set(principalHeader({ ...suspended.principal, outletId: suspended.outletIds[1] }))
      .send({ id: randomUUID(), name: 'Terrace' });

    expect(res.status).toBe(201);
  });

  it("refuses with 403 FORBIDDEN a principal whose outlet is another tenant's", async () => {
    const res = await http
      .post('/api/v1/probe/floors')
      .set(principalHeader({ ...suspended.principal, outletId: active.outletIds[0] }))
      .send({ id: randomUUID(), name: 'Terrace' });

    expect(res.status).toBe(403);
    expect(res.body).toMatchObject({ code: 'FORBIDDEN' });
  });
});
