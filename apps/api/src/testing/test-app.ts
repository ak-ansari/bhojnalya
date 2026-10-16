// The real API, built as main.ts builds it (real auth guard included), plus two
// test-only pieces: a second guard that takes a principal from the
// X-Test-Principal header, so platform tests need not sign in, and probe routes
// that exercise the request pipeline. Requests with a real bearer token go
// through the real guard. Also a tenant fixture, seeded as the superuser.
import { randomUUID } from 'node:crypto';
import type { Server } from 'node:http';
import { Writable } from 'node:stream';

import { floors } from '@bhojnalya/db';
import type { Tx } from '@bhojnalya/db';
import { Controller, Get, HttpCode, Injectable, Module, Post, Req } from '@nestjs/common';
import type { CanActivate, ExecutionContext, INestApplication } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { sql } from 'drizzle-orm';
import type pg from 'pg';
import request from 'supertest';
import type TestAgent from 'supertest/lib/agent.js';
import { z } from 'zod';

import { createApp } from '../app.js';
import type { AuthOverrides } from '../platform/auth/auth.module.js';
import type { ApiRequest, Principal } from '../platform/http/api-request.js';
import { AllowWhenSuspended } from '../platform/tenancy/public.decorator.js';
import { TenantTx } from '../platform/tenancy/tenant-transaction.interceptor.js';
import { Returns, ZodBody } from '../platform/validation/zod.js';

export const PRINCIPAL_HEADER = 'X-Test-Principal';

export interface TestApp {
  app: INestApplication;
  logs: Record<string, unknown>[];
}

export async function createTestApp(
  databaseUrl: string,
  auth: AuthOverrides = {},
): Promise<TestApp> {
  const logs: Record<string, unknown>[] = [];
  const app = await createApp({
    config: {
      NODE_ENV: 'test',
      PORT: 0,
      DATABASE_URL: databaseUrl,
      DB_POOL_SIZE: 10,
      LOG_LEVEL: 'info',
    },
    imports: [ProbeModule],
    auth,
    logDestination: new Writable({
      write(chunk: Buffer, _encoding, done) {
        logs.push(JSON.parse(chunk.toString()) as Record<string, unknown>);
        done();
      },
    }),
  });
  await app.init();
  return { app, logs };
}

export function agentFor(app: INestApplication): TestAgent {
  return request(app.getHttpServer() as Server);
}

export function principalHeader(principal: Principal): Record<string, string> {
  return { [PRINCIPAL_HEADER]: JSON.stringify(principal) };
}

export const NewFloor = z.object({
  id: z.uuid(),
  name: z.string().min(1),
  // Holds the transaction open, so a duplicate can arrive while it runs.
  holdMs: z.number().int().min(0).max(2_000).optional(),
});

export const CreatedFloor = z.object({ id: z.uuid(), name: z.string(), runId: z.uuid() });

@Controller('probe')
class ProbeController {
  @Get('context')
  async context(@TenantTx() tx: Tx): Promise<Record<string, unknown>> {
    const { rows } = await tx.execute(
      sql`SELECT current_user AS "currentUser",
                 current_setting('app.tenant_id', true) AS "tenantId",
                 current_setting('app.outlet_ids', true) AS "outletIds",
                 (SELECT count(*)::int FROM floors) AS "visibleFloors"`,
    );
    return rows[0] ?? {};
  }

  @Post('floors')
  @HttpCode(201)
  @Returns(201, 'The floor, and a value unique to the run that created it', CreatedFloor)
  async createFloor(
    @TenantTx() tx: Tx,
    @Req() req: ApiRequest,
    @ZodBody(NewFloor) body: z.infer<typeof NewFloor>,
  ): Promise<z.infer<typeof CreatedFloor>> {
    await insertFloor(tx, req, body);
    if (body.holdMs) await tx.execute(sql`SELECT pg_sleep(${body.holdMs / 1000})`);
    return { id: body.id, name: body.name, runId: randomUUID() };
  }

  @Post('floors-then-fail')
  async createFloorThenFail(
    @TenantTx() tx: Tx,
    @Req() req: ApiRequest,
    @ZodBody(NewFloor) body: z.infer<typeof NewFloor>,
  ): Promise<never> {
    await insertFloor(tx, req, body);
    throw new Error('probe: failed after writing, with a secret in the message');
  }

  @Post('record-keeping')
  @HttpCode(200)
  @AllowWhenSuspended()
  recordKeeping(): { accepted: true } {
    return { accepted: true };
  }
}

async function insertFloor(tx: Tx, req: ApiRequest, body: z.infer<typeof NewFloor>): Promise<void> {
  const principal = req.principal as Principal;
  await tx.insert(floors).values({
    id: body.id,
    tenantId: principal.tenantId,
    outletId: principal.outletId ?? '',
    name: body.name,
  });
}

@Injectable()
class HeaderPrincipalGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<ApiRequest>();
    const header = req.header(PRINCIPAL_HEADER);
    if (header !== undefined) req.principal = JSON.parse(header) as Principal;
    return true;
  }
}

@Module({
  controllers: [ProbeController],
  providers: [{ provide: APP_GUARD, useClass: HeaderPrincipalGuard }],
})
class ProbeModule {}

// --- fixtures, as superuser ---------------------------------------------------

export interface TenantFixture {
  tenantId: string;
  outletIds: [string, string];
  principal: Principal;
}

let prefix = 0;

export async function createTenant(superuser: pg.Client): Promise<TenantFixture> {
  const tenantId = randomUUID();
  const outletIds: [string, string] = [randomUUID(), randomUUID()];
  await superuser.query('INSERT INTO tenants (id, name) VALUES ($1, $2)', [tenantId, 'Chai Point']);
  for (const outletId of outletIds) {
    prefix += 1;
    await superuser.query(
      `INSERT INTO outlets (id, tenant_id, name, legal_name, address_line1, city, pincode, state_code, invoice_prefix)
       VALUES ($1, $2, 'Bandra', 'Chai Point Pvt Ltd', '1 Hill Road', 'Mumbai', '400050', '27', $3)`,
      [outletId, tenantId, String(prefix % 100).padStart(2, '0')],
    );
  }
  return {
    tenantId,
    outletIds,
    principal: { tenantId, outletIds, outletId: outletIds[0], deviceId: randomUUID() },
  };
}

export async function suspendOutlet(superuser: pg.Client, outletId: string): Promise<void> {
  await superuser.query(
    "UPDATE outlets SET status = 'suspended', suspended_at = now(), suspension_reason = 'unpaid' WHERE id = $1",
    [outletId],
  );
}
