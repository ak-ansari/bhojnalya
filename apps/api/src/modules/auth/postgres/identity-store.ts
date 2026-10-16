// IdentityStore on Postgres: the pre-sign-in lookups (ADR 0019) find the
// tenant, then everything else runs in withTenant as app_user under RLS.
import {
  passwordResetCodes,
  refreshTokens,
  resolveLogin,
  resolveRefreshToken,
  userOutletRoles,
  users,
  withTenant,
} from '@bhojnalya/db';
import type { Db, Tx } from '@bhojnalya/db';
import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, gt, isNull, sql } from 'drizzle-orm';

import { DB } from '../../../platform/db/database.module.js';
import type { OutletRoleGrant } from '../../../platform/http/api-request.js';
import type {
  IdentityStore,
  RefreshTokenRecord,
  ResetCodeRecord,
  TenantIdentity,
  UserRecord,
} from '../app/ports.js';

@Injectable()
export class PgIdentityStore implements IdentityStore {
  constructor(@Inject(DB) private readonly db: Db) {}

  findLogin(login: string): Promise<{ tenantId: string; userId: string } | null> {
    return resolveLogin(this.db, login);
  }

  findRefreshToken(
    tokenHash: string,
  ): Promise<{ tenantId: string; userId: string; refreshTokenId: string } | null> {
    return resolveRefreshToken(this.db, tokenHash);
  }

  // Identity tables are tenant-wide, so no outlet needs to be open.
  inTenant<T>(tenantId: string, fn: (identity: TenantIdentity) => Promise<T>): Promise<T> {
    return withTenant(this.db, { tenantId, outletIds: [] }, (tx) =>
      fn(new PgTenantIdentity(tx, tenantId)),
    );
  }
}

class PgTenantIdentity implements TenantIdentity {
  constructor(
    private readonly tx: Tx,
    private readonly tenantId: string,
  ) {}

  async user(userId: string): Promise<UserRecord | null> {
    const [row] = await this.tx
      .select({
        id: users.id,
        tenantId: users.tenantId,
        name: users.name,
        email: users.email,
        passwordHash: users.passwordHash,
        status: users.status,
      })
      .from(users)
      .where(eq(users.id, userId));
    return row ?? null;
  }

  grants(userId: string): Promise<OutletRoleGrant[]> {
    return this.tx
      .select({ outletId: userOutletRoles.outletId, role: userOutletRoles.role })
      .from(userOutletRoles)
      .where(eq(userOutletRoles.userId, userId))
      .orderBy(userOutletRoles.outletId);
  }

  async recordLogin(userId: string, at: Date): Promise<void> {
    await this.tx.update(users).set({ lastLoginAt: at }).where(eq(users.id, userId));
  }

  async setPassword(userId: string, passwordHash: string, at: Date): Promise<void> {
    await this.tx.update(users).set({ passwordHash, updatedAt: at }).where(eq(users.id, userId));
  }

  async addRefreshToken(token: {
    id: string;
    userId: string;
    familyId: string;
    tokenHash: string;
    expiresAt: Date;
  }): Promise<void> {
    await this.tx.insert(refreshTokens).values({ ...token, tenantId: this.tenantId });
  }

  async lockRefreshToken(id: string): Promise<RefreshTokenRecord | null> {
    const [row] = await this.tx
      .select({
        id: refreshTokens.id,
        userId: refreshTokens.userId,
        familyId: refreshTokens.familyId,
        expiresAt: refreshTokens.expiresAt,
        replacedById: refreshTokens.replacedById,
        revokedAt: refreshTokens.revokedAt,
      })
      .from(refreshTokens)
      .where(eq(refreshTokens.id, id))
      .for('update');
    return row ?? null;
  }

  async markRefreshTokenReplaced(id: string, replacedById: string): Promise<void> {
    await this.tx.update(refreshTokens).set({ replacedById }).where(eq(refreshTokens.id, id));
  }

  async revokeRefreshFamily(familyId: string, at: Date): Promise<void> {
    await this.tx
      .update(refreshTokens)
      .set({ revokedAt: at })
      .where(and(eq(refreshTokens.familyId, familyId), isNull(refreshTokens.revokedAt)));
  }

  async revokeUserRefreshTokens(userId: string, at: Date): Promise<void> {
    await this.tx
      .update(refreshTokens)
      .set({ revokedAt: at })
      .where(and(eq(refreshTokens.userId, userId), isNull(refreshTokens.revokedAt)));
  }

  async spendOpenResetCodes(userId: string, at: Date): Promise<void> {
    await this.tx
      .update(passwordResetCodes)
      .set({ consumedAt: at })
      .where(and(eq(passwordResetCodes.userId, userId), isNull(passwordResetCodes.consumedAt)));
  }

  async addResetCode(code: {
    id: string;
    userId: string;
    codeHash: string;
    expiresAt: Date;
  }): Promise<void> {
    await this.tx.insert(passwordResetCodes).values({ ...code, tenantId: this.tenantId });
  }

  async lockOpenResetCode(userId: string, at: Date): Promise<ResetCodeRecord | null> {
    const [row] = await this.tx
      .select({
        id: passwordResetCodes.id,
        codeHash: passwordResetCodes.codeHash,
        failedAttempts: passwordResetCodes.failedAttempts,
      })
      .from(passwordResetCodes)
      .where(
        and(
          eq(passwordResetCodes.userId, userId),
          isNull(passwordResetCodes.consumedAt),
          gt(passwordResetCodes.expiresAt, at),
        ),
      )
      .orderBy(desc(passwordResetCodes.createdAt))
      .limit(1)
      .for('update');
    return row ?? null;
  }

  async recordWrongResetCode(id: string, spend: boolean, at: Date): Promise<void> {
    await this.tx
      .update(passwordResetCodes)
      .set({
        failedAttempts: sql`${passwordResetCodes.failedAttempts} + 1`,
        ...(spend ? { consumedAt: at } : {}),
      })
      .where(eq(passwordResetCodes.id, id));
  }

  async spendResetCode(id: string, at: Date): Promise<void> {
    await this.tx
      .update(passwordResetCodes)
      .set({ consumedAt: at })
      .where(eq(passwordResetCodes.id, id));
  }
}
