// GET /healthz: the API is up and can reach Postgres (TRD §16). Outside
// /api/v1 and outside any tenant, for the external uptime check.
import { ERROR_CODES } from '@bhojnalya/contracts';
import { Controller, Get, Inject } from '@nestjs/common';
import type { Pool } from 'pg';
import { z } from 'zod';

import { PG_POOL } from '../db/database.module.js';
import { ApiError } from '../errors/api-error.js';
import { Public } from '../tenancy/public.decorator.js';
import { Returns } from '../validation/zod.js';

export const Health = z.object({ status: z.literal('ok'), db: z.literal('ok') });
export type Health = z.infer<typeof Health>;

@Controller()
export class HealthController {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  @Public()
  @Get('healthz')
  @Returns(200, 'The API is up and its database answers', Health)
  async check(): Promise<Health> {
    try {
      await this.pool.query('SELECT 1');
    } catch {
      throw new ApiError(503, ERROR_CODES.INTERNAL_ERROR, 'The database is not reachable.');
    }
    return { status: 'ok', db: 'ok' };
  }
}
