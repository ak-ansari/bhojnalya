// Builds the API: one Nest app with REST under /api/v1, the platform's
// request pipeline and pg-boss, all in one process (TRD §3.2, ADR 0011).
// main.ts listens on it; the integration tests build the same app.
import 'reflect-metadata';

import { Module } from '@nestjs/common';
import type { DynamicModule, INestApplication, ModuleMetadata } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR, DiscoveryModule, NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Logger, LoggerModule } from 'nestjs-pino';
import type { DestinationStream } from 'pino';

import { API_CONFIG } from './platform/config.js';
import type { ApiConfig } from './platform/config.js';
import { DatabaseModule } from './platform/db/database.module.js';
import { ErrorEnvelopeFilter } from './platform/errors/error-envelope.filter.js';
import { HealthController } from './platform/health/health.controller.js';
import { IdempotencyInterceptor } from './platform/idempotency/idempotency.interceptor.js';
import { JobsModule } from './platform/jobs/jobs.module.js';
import { loggerParams } from './platform/logging/logging.js';
import {
  API_PREFIX,
  OpenApiController,
  OpenApiDocumentBuilder,
  UNPREFIXED_ROUTES,
} from './platform/openapi/openapi.js';
import { SuspendedOutletInterceptor } from './platform/tenancy/suspended-outlet.interceptor.js';
import { TenantTransactionInterceptor } from './platform/tenancy/tenant-transaction.interceptor.js';

export interface AppOptions {
  config: ApiConfig;
  // Feature modules; the integration tests add their own probes here.
  imports?: ModuleMetadata['imports'];
  logDestination?: DestinationStream;
}

export async function createApp(options: AppOptions): Promise<INestApplication> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule.register(options), {
    bufferLogs: true,
  });
  app.useLogger(app.get(Logger));
  app.setGlobalPrefix(API_PREFIX, { exclude: UNPREFIXED_ROUTES });
  app.enableShutdownHooks();
  return app;
}

@Module({})
export class AppModule {
  static register({ config, imports = [], logDestination }: AppOptions): DynamicModule {
    return {
      module: AppModule,
      global: true,
      imports: [
        LoggerModule.forRoot(loggerParams(config, logDestination)),
        DiscoveryModule,
        DatabaseModule,
        JobsModule,
        ...imports,
      ],
      controllers: [HealthController, OpenApiController],
      providers: [
        { provide: API_CONFIG, useValue: config },
        OpenApiDocumentBuilder,
        { provide: APP_FILTER, useClass: ErrorEnvelopeFilter },
        // In this order, outermost first: the tenant transaction wraps the
        // suspension check, which wraps the idempotency claim and the handler.
        { provide: APP_INTERCEPTOR, useClass: TenantTransactionInterceptor },
        { provide: APP_INTERCEPTOR, useClass: SuspendedOutletInterceptor },
        { provide: APP_INTERCEPTOR, useClass: IdempotencyInterceptor },
      ],
      exports: [API_CONFIG],
    };
  }
}
