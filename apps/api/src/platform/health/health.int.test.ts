import type { INestApplication } from '@nestjs/common';
import type { Pool } from 'pg';
import type { PgBoss } from 'pg-boss';
import type TestAgent from 'supertest/lib/agent.js';
import { afterAll, beforeAll, describe, expect, inject, it } from 'vitest';

import { agentFor, createTestApp } from '../../testing/test-app.js';
import { PG_POOL } from '../db/database.module.js';
import { JOBS } from '../jobs/jobs.module.js';

let app: INestApplication;
let http: TestAgent;

beforeAll(async () => {
  ({ app } = await createTestApp(inject('databaseUrls').app));
  http = agentFor(app);
});

afterAll(async () => {
  await app.close();
});

describe('the running API', () => {
  it('answers GET /healthz with 200 when its database answers, outside /api/v1 and without a principal', async () => {
    const res = await http.get('/healthz');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok', db: 'ok' });
  });

  it('runs pg-boss in-process as app_user, able to create a queue and send and fetch a job', async () => {
    const boss = app.get<PgBoss>(JOBS);

    const { rows } = await boss.getDb().executeSql('SELECT current_user AS who');
    await boss.createQueue('probe-queue');
    const id = await boss.send('probe-queue', { outletId: 'x' });
    const [job] = await boss.fetch('probe-queue');

    expect(rows).toEqual([{ who: 'app_user' }]);
    expect(job?.id).toBe(id);
  });

  it('publishes an OpenAPI document generated from the routes and their Zod schemas', async () => {
    const res = await http.get('/api/v1/openapi.json');

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ openapi: '3.1.0' });
    const { paths } = res.body as { paths: Record<string, Record<string, unknown>> };
    expect(paths['/healthz']?.get).toMatchObject({
      responses: { 200: { content: { 'application/json': { schema: { type: 'object' } } } } },
    });
    expect(paths['/api/v1/probe/floors']?.post).toMatchObject({
      requestBody: {
        content: {
          'application/json': {
            schema: { required: expect.arrayContaining(['id', 'name']) as unknown },
          },
        },
      },
    });
  });

  // Last: it ends the pool.
  it('answers GET /healthz with 503 in the error envelope when the database does not answer', async () => {
    await app.get<Pool>(PG_POOL).end();

    const res = await http.get('/healthz');

    expect(res.status).toBe(503);
    expect(res.body).toMatchObject({ code: 'INTERNAL_ERROR' });
  });
});
