// The application's one connection pool, as app_user (TRD §5.2, §15.2), and
// the Drizzle handle over it. Tenant data is only reached through the tenant
// transaction the tenancy layer opens on this handle.
import { createDb } from '@bhojnalya/db';
import type { Db } from '@bhojnalya/db';
import { Global, Inject, Module } from '@nestjs/common';
import type { OnApplicationShutdown } from '@nestjs/common';
import pg from 'pg';

import { API_CONFIG } from '../config.js';
import type { ApiConfig } from '../config.js';

export const PG_POOL = Symbol('PG_POOL');
export const DB = Symbol('DB');

@Global()
@Module({
  providers: [
    {
      provide: PG_POOL,
      inject: [API_CONFIG],
      useFactory: (config: ApiConfig): pg.Pool =>
        new pg.Pool({
          connectionString: config.DATABASE_URL,
          max: config.DB_POOL_SIZE,
          connectionTimeoutMillis: 5_000,
        }),
    },
    { provide: DB, inject: [PG_POOL], useFactory: (pool: pg.Pool): Db => createDb(pool) },
  ],
  exports: [PG_POOL, DB],
})
export class DatabaseModule implements OnApplicationShutdown {
  constructor(@Inject(PG_POOL) private readonly pool: pg.Pool) {}

  async onApplicationShutdown(): Promise<void> {
    if (!this.pool.ended) await this.pool.end();
  }
}
