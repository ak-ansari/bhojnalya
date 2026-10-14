// pg-boss in the API's own process (TRD §3.2, ADR 0011), as app_user (ADR 0020).
// It only runs jobs: its tables are installed by the migrate step as the owner,
// so the running API never needs to create or alter anything. No queues yet.
import { Global, Inject, Logger, Module } from '@nestjs/common';
import type { OnApplicationBootstrap, OnApplicationShutdown } from '@nestjs/common';
import { PgBoss } from 'pg-boss';

import { API_CONFIG } from '../config.js';
import type { ApiConfig } from '../config.js';

export const JOBS = Symbol('JOBS');
export const JOBS_SCHEMA = 'pgboss';

@Global()
@Module({
  providers: [
    {
      provide: JOBS,
      inject: [API_CONFIG],
      useFactory: (config: ApiConfig): PgBoss =>
        new PgBoss({
          connectionString: config.DATABASE_URL,
          schema: JOBS_SCHEMA,
          // Beside the request pool's 10 of Postgres's 50 (TRD §15.2).
          max: 2,
          migrate: false,
          createSchema: false,
        }),
    },
  ],
  exports: [JOBS],
})
export class JobsModule implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly logger = new Logger('Jobs');

  constructor(@Inject(JOBS) private readonly boss: PgBoss) {}

  async onApplicationBootstrap(): Promise<void> {
    this.boss.on('error', (error) => {
      this.logger.error(error);
    });
    await this.boss.start();
  }

  async onApplicationShutdown(): Promise<void> {
    await this.boss.stop({ graceful: true, close: true });
  }
}

// Installs or upgrades pg-boss's tables as the migration owner, after the SQL
// migrations have created its schema. Part of the migrate step, never of start.
export async function installJobs(ownerConnectionString: string): Promise<void> {
  const boss = new PgBoss({
    connectionString: ownerConnectionString,
    schema: JOBS_SCHEMA,
    max: 1,
    migrate: true,
    createSchema: false,
    supervise: false,
    schedule: false,
  });
  boss.on('error', (error) => {
    throw error;
  });
  await boss.start();
  await boss.stop({ graceful: false, close: true });
}
