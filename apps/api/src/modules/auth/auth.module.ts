// Owner sign-in, refresh tokens and password reset (TRD §13). The guard that
// turns a token into a principal is the platform's (platform/auth).
import { Module } from '@nestjs/common';

import { AuthService } from './app/auth.service.js';
import { IDENTITY_STORE, PASSWORD_HASHER } from './app/ports.js';
import { AuthController } from './http/auth.controller.js';
import { Argon2PasswordHasher } from './postgres/argon2-password-hasher.js';
import { PgIdentityStore } from './postgres/identity-store.js';

@Module({
  controllers: [AuthController],
  providers: [
    AuthService,
    { provide: IDENTITY_STORE, useClass: PgIdentityStore },
    { provide: PASSWORD_HASHER, useClass: Argon2PasswordHasher },
  ],
  exports: [PASSWORD_HASHER],
})
export class AuthModule {}
