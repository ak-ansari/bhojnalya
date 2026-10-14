import { randomUUID } from 'node:crypto';

import { ErrorEnvelope } from '@bhojnalya/contracts';
import type { INestApplication } from '@nestjs/common';
import pg from 'pg';
import type TestAgent from 'supertest/lib/agent.js';
import { afterAll, beforeAll, describe, expect, inject, it } from 'vitest';

import { createTenant, agentFor, createTestApp, principalHeader } from '../../testing/test-app.js';
import type { TenantFixture } from '../../testing/test-app.js';

let app: INestApplication;
let http: TestAgent;
let superuser: pg.Client;
let tenant: TenantFixture;

beforeAll(async () => {
  const urls = inject('databaseUrls');
  superuser = new pg.Client({ connectionString: urls.superuser });
  await superuser.connect();
  tenant = await createTenant(superuser);
  ({ app } = await createTestApp(urls.app));
  http = agentFor(app);
});

afterAll(async () => {
  await app.close();
  await superuser.end();
});

describe('ErrorEnvelopeFilter', () => {
  it('answers a body that fails its schema with 400 VALIDATION_FAILED, the failing fields and the request id', async () => {
    const res = await http
      .post('/api/v1/probe/floors')
      .set(principalHeader(tenant.principal))
      .set('X-Request-Id', 'req-validation-1')
      .send({ id: 'not-a-uuid', name: '' });

    expect(res.status).toBe(400);
    expect(ErrorEnvelope.parse(res.body)).toEqual(res.body);
    expect(res.body).toMatchObject({
      code: 'VALIDATION_FAILED',
      requestId: 'req-validation-1',
      details: expect.arrayContaining([
        expect.objectContaining({ path: 'id' }),
        expect.objectContaining({ path: 'name' }),
      ]) as unknown,
    });
    expect(res.headers['x-request-id']).toBe('req-validation-1');
  });

  it('answers malformed JSON with 400 VALIDATION_FAILED in the same envelope', async () => {
    const res = await http
      .post('/api/v1/probe/floors')
      .set(principalHeader(tenant.principal))
      .set('Content-Type', 'application/json')
      .send('{"id": ');

    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({ code: 'VALIDATION_FAILED' });
    expect(ErrorEnvelope.parse(res.body)).toEqual(res.body);
  });

  it('answers an unknown route with 404 NOT_FOUND in the envelope', async () => {
    const res = await http.get('/api/v1/no-such-route');

    expect(res.status).toBe(404);
    expect(res.body).toMatchObject({ code: 'NOT_FOUND' });
    expect(ErrorEnvelope.parse(res.body)).toEqual(res.body);
  });

  it("answers a bug with 500 INTERNAL_ERROR and a generated request id, never the bug's message", async () => {
    const res = await http
      .post('/api/v1/probe/floors-then-fail')
      .set(principalHeader(tenant.principal))
      .send({ id: randomUUID(), name: 'Terrace' });

    expect(res.status).toBe(500);
    expect(res.body).toEqual({
      code: 'INTERNAL_ERROR',
      message: 'Something went wrong.',
      requestId: res.headers['x-request-id'],
    });
    expect((res.body as { requestId: string }).requestId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-7/);
  });
});
