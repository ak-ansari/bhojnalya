// Owner sign-in, refresh-token rotation, sign-out and email password reset
// (TRD §13). Each use case finds the tenant from what the caller holds (ADR
// 0019), then does all its work in that tenant's one transaction. A failure
// that must still be recorded (a replayed refresh token, a wrong reset code)
// is decided inside the transaction and thrown after it commits.
import { createHmac, timingSafeEqual } from 'node:crypto';

import { newId } from '@bhojnalya/contracts';
import type { AuthSession, LoginRequest, PasswordResetConfirm } from '@bhojnalya/contracts';
import { Inject, Injectable, Logger } from '@nestjs/common';

import { AUTH_SECRET, AccessTokens } from '../../../platform/auth/access-tokens.js';
import {
  REFRESH_TOKEN_PREFIX,
  hashOpaqueToken,
  newOpaqueToken,
} from '../../../platform/auth/secrets.js';
import { CLOCK } from '../../../platform/clock.js';
import type { Clock } from '../../../platform/clock.js';
import { ApiError } from '../../../platform/errors/api-error.js';
import type { OutletRoleGrant } from '../../../platform/http/api-request.js';
import { MAIL_TRANSPORT } from '../../../platform/mail/mail-transport.js';
import type { MailTransport } from '../../../platform/mail/mail-transport.js';
import {
  MAX_RESET_CODE_ATTEMPTS,
  REFRESH_TOKEN_TTL_MS,
  RESET_CODE_TTL_MS,
  addMs,
  newResetCode,
} from '../domain/policy.js';
import { IDENTITY_STORE, PASSWORD_HASHER } from './ports.js';
import type { IdentityStore, PasswordHasher, TenantIdentity, UserRecord } from './ports.js';

export interface SignedIn {
  session: AuthSession;
  // Goes only into the httpOnly cookie, never into a body or a log.
  refreshToken: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @Inject(IDENTITY_STORE) private readonly store: IdentityStore,
    @Inject(PASSWORD_HASHER) private readonly passwords: PasswordHasher,
    @Inject(AccessTokens) private readonly accessTokens: AccessTokens,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(MAIL_TRANSPORT) private readonly mail: MailTransport,
    @Inject(AUTH_SECRET) private readonly secret: Uint8Array,
  ) {}

  // An unknown login and a wrong password answer alike, after the same work.
  async login({ login, password }: LoginRequest): Promise<SignedIn> {
    const found = await this.store.findLogin(login);
    if (!found) {
      await this.passwords.verify(await this.dummyHash(), password);
      throw invalidCredentials();
    }
    const now = this.clock.now();
    const signedIn = await this.store.inTenant(found.tenantId, async (identity) => {
      const user = await identity.user(found.userId);
      if (!user || !(await this.passwords.verify(user.passwordHash, password))) return null;
      if (user.status !== 'active') return null;
      await identity.recordLogin(user.id, now);
      return this.startSession(identity, user, newId(), now);
    });
    if (!signedIn) throw invalidCredentials();
    return signedIn;
  }

  // Rotation with reuse detection: each refresh token works once. Presenting
  // one that was already replaced or revoked revokes its whole family, so a
  // stolen token and the real one cannot both stay signed in.
  async refresh(refreshToken: string | undefined): Promise<SignedIn> {
    if (!refreshToken?.startsWith(REFRESH_TOKEN_PREFIX)) throw ApiError.unauthenticated();
    const found = await this.store.findRefreshToken(hashOpaqueToken(refreshToken));
    if (!found) throw ApiError.unauthenticated();
    const now = this.clock.now();
    const signedIn = await this.store.inTenant(found.tenantId, async (identity) => {
      const token = await identity.lockRefreshToken(found.refreshTokenId);
      if (!token) return null;
      if (token.replacedById !== null || token.revokedAt !== null) {
        await identity.revokeRefreshFamily(token.familyId, now);
        return null;
      }
      if (token.expiresAt <= now) return null;
      const user = await identity.user(token.userId);
      if (user?.status !== 'active') {
        await identity.revokeRefreshFamily(token.familyId, now);
        return null;
      }
      const next = await this.startSession(identity, user, token.familyId, now);
      await identity.markRefreshTokenReplaced(token.id, next.refreshTokenId);
      return next;
    });
    if (!signedIn) throw ApiError.unauthenticated('The sign-in has ended. Sign in again.');
    return signedIn;
  }

  // Ends the family the token belongs to. Quietly does nothing for a token it
  // does not know, so signing out always succeeds.
  async logout(refreshToken: string | undefined): Promise<void> {
    if (!refreshToken?.startsWith(REFRESH_TOKEN_PREFIX)) return;
    const found = await this.store.findRefreshToken(hashOpaqueToken(refreshToken));
    if (!found) return;
    const now = this.clock.now();
    await this.store.inTenant(found.tenantId, async (identity) => {
      const token = await identity.lockRefreshToken(found.refreshTokenId);
      if (token) await identity.revokeRefreshFamily(token.familyId, now);
    });
  }

  // Sends a six-digit code to a known, active account's email. Answers the
  // same whether or not the email is known; a newer code spends older ones.
  async requestPasswordReset(email: string): Promise<void> {
    const found = await this.store.findLogin(email);
    if (!found) return;
    const now = this.clock.now();
    const issued = await this.store.inTenant(found.tenantId, async (identity) => {
      const user = await identity.user(found.userId);
      if (user?.status !== 'active' || user.email.toLowerCase() !== email.toLowerCase()) {
        return null;
      }
      await identity.spendOpenResetCodes(user.id, now);
      const id = newId();
      const code = newResetCode();
      await identity.addResetCode({
        id,
        userId: user.id,
        codeHash: this.resetCodeHash(id, code),
        expiresAt: addMs(now, RESET_CODE_TTL_MS),
      });
      return { to: user.email, code };
    });
    if (!issued) return;
    try {
      await this.mail.send({
        to: issued.to,
        subject: 'Your Bhojnalya password reset code',
        text: `Your code is ${issued.code}. It works once, for ${String(RESET_CODE_TTL_MS / 60_000)} minutes.`,
      });
    } catch (error) {
      // Not surfaced, so the answer still does not reveal whether the email exists.
      this.logger.error({ err: error }, 'Sending a password reset email failed.');
    }
  }

  // Spends a correct code, sets the new password and signs out every session.
  async confirmPasswordReset({ email, code, newPassword }: PasswordResetConfirm): Promise<void> {
    const found = await this.store.findLogin(email);
    if (!found) throw invalidResetCode();
    const now = this.clock.now();
    const passwordHash = await this.passwords.hash(newPassword);
    const reset = await this.store.inTenant(found.tenantId, async (identity) => {
      const open = await identity.lockOpenResetCode(found.userId, now);
      if (!open) return false;
      if (!this.matches(open.codeHash, this.resetCodeHash(open.id, code))) {
        const spend = open.failedAttempts + 1 >= MAX_RESET_CODE_ATTEMPTS;
        await identity.recordWrongResetCode(open.id, spend, now);
        return false;
      }
      await identity.spendResetCode(open.id, now);
      await identity.setPassword(found.userId, passwordHash, now);
      await identity.revokeUserRefreshTokens(found.userId, now);
      return true;
    });
    if (!reset) throw invalidResetCode();
  }

  private async startSession(
    identity: TenantIdentity,
    user: UserRecord,
    familyId: string,
    now: Date,
  ): Promise<SignedIn & { refreshTokenId: string }> {
    const refreshToken = newOpaqueToken(REFRESH_TOKEN_PREFIX);
    const refreshTokenId = newId();
    await identity.addRefreshToken({
      id: refreshTokenId,
      userId: user.id,
      familyId,
      tokenHash: hashOpaqueToken(refreshToken),
      expiresAt: addMs(now, REFRESH_TOKEN_TTL_MS),
    });
    const grants = await identity.grants(user.id);
    const access = await this.accessTokens.issue({ userId: user.id, tenantId: user.tenantId }, now);
    return {
      refreshToken,
      refreshTokenId,
      session: {
        accessToken: access.token,
        accessTokenExpiresAt: access.expiresAt.toISOString(),
        user: { id: user.id, tenantId: user.tenantId, name: user.name, email: user.email },
        outlets: grants.map((g: OutletRoleGrant) => ({ outletId: g.outletId, role: g.role })),
      },
    };
  }

  // Keyed by the server's secret and bound to the code's own row, so the
  // stored hash cannot be reversed by trying a million codes without the key.
  private resetCodeHash(id: string, code: string): string {
    return createHmac('sha256', this.secret).update(`${id}:${code}`).digest('hex');
  }

  private matches(stored: string, candidate: string): boolean {
    const a = Buffer.from(stored, 'hex');
    const b = Buffer.from(candidate, 'hex');
    return a.length === b.length && timingSafeEqual(a, b);
  }

  private dummy: Promise<string> | undefined;

  // A real hash to verify against when the login is unknown, made once.
  private dummyHash(): Promise<string> {
    this.dummy ??= this.passwords.hash('not-a-real-password');
    return this.dummy;
  }
}

function invalidCredentials(): ApiError {
  return new ApiError(401, 'INVALID_CREDENTIALS', 'The email, phone or password is wrong.');
}

function invalidResetCode(): ApiError {
  return new ApiError(400, 'INVALID_RESET_CODE', 'The code is wrong or has expired.');
}
