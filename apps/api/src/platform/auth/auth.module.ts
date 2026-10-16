// The platform's authentication pieces, global so every feature can use them:
// the auth guard (an APP_GUARD, so it runs before the tenant interceptor), the
// access-token signer, the clock and the mail transport. Tests swap the clock
// and the mail transport through `register`.
import { randomBytes } from 'node:crypto';

import { Global, Logger, Module } from '@nestjs/common';
import type { DynamicModule } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';

import { CLOCK, systemClock } from '../clock.js';
import type { Clock } from '../clock.js';
import { API_CONFIG } from '../config.js';
import type { ApiConfig } from '../config.js';
import { MAIL_TRANSPORT, mailTransportFor } from '../mail/mail-transport.js';
import type { MailTransport } from '../mail/mail-transport.js';
import { AUTH_SECRET, AccessTokens } from './access-tokens.js';
import { AuthGuard } from './auth.guard.js';

export interface AuthOverrides {
  clock?: Clock;
  mailTransport?: MailTransport;
}

@Global()
@Module({})
export class PlatformAuthModule {
  static register(overrides: AuthOverrides = {}): DynamicModule {
    return {
      module: PlatformAuthModule,
      providers: [
        { provide: AUTH_SECRET, inject: [API_CONFIG], useFactory: authSecret },
        { provide: CLOCK, useValue: overrides.clock ?? systemClock },
        {
          provide: MAIL_TRANSPORT,
          inject: [API_CONFIG],
          useFactory: (config: ApiConfig) => overrides.mailTransport ?? mailTransportFor(config),
        },
        AccessTokens,
        { provide: APP_GUARD, useClass: AuthGuard },
      ],
      exports: [AUTH_SECRET, CLOCK, MAIL_TRANSPORT, AccessTokens],
    };
  }
}

function authSecret(config: ApiConfig): Uint8Array {
  if (config.AUTH_TOKEN_SECRET !== undefined) {
    return new TextEncoder().encode(config.AUTH_TOKEN_SECRET);
  }
  if (config.NODE_ENV === 'production') {
    new Logger('Auth').warn(
      'AUTH_TOKEN_SECRET is not set: this process signs with its own secret, so access tokens stop working at a restart and clients refresh.',
    );
  }
  return randomBytes(32);
}
