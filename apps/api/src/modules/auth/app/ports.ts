// What the auth use cases need from storage and crypto. The Postgres adapter
// implements IdentityStore; every tenant read goes through `inTenant`, which
// opens that tenant's transaction after a pre-sign-in lookup (ADR 0019).
import type { OutletRoleGrant } from '../../../platform/http/api-request.js';

export interface IdentityStore {
  findLogin(login: string): Promise<{ tenantId: string; userId: string } | null>;
  findRefreshToken(
    tokenHash: string,
  ): Promise<{ tenantId: string; userId: string; refreshTokenId: string } | null>;
  inTenant<T>(tenantId: string, fn: (identity: TenantIdentity) => Promise<T>): Promise<T>;
}

export const IDENTITY_STORE = Symbol('IDENTITY_STORE');

export interface UserRecord {
  id: string;
  tenantId: string;
  name: string;
  email: string;
  passwordHash: string;
  status: 'active' | 'disabled';
}

export interface RefreshTokenRecord {
  id: string;
  userId: string;
  familyId: string;
  expiresAt: Date;
  replacedById: string | null;
  revokedAt: Date | null;
}

export interface ResetCodeRecord {
  id: string;
  codeHash: string;
  failedAttempts: number;
}

// One tenant's identity rows, inside one transaction.
export interface TenantIdentity {
  user(userId: string): Promise<UserRecord | null>;
  grants(userId: string): Promise<OutletRoleGrant[]>;
  recordLogin(userId: string, at: Date): Promise<void>;
  setPassword(userId: string, passwordHash: string, at: Date): Promise<void>;

  addRefreshToken(token: {
    id: string;
    userId: string;
    familyId: string;
    tokenHash: string;
    expiresAt: Date;
  }): Promise<void>;
  // Locked until the transaction ends, so two uses of one token are serialised.
  lockRefreshToken(id: string): Promise<RefreshTokenRecord | null>;
  markRefreshTokenReplaced(id: string, replacedById: string): Promise<void>;
  revokeRefreshFamily(familyId: string, at: Date): Promise<void>;
  revokeUserRefreshTokens(userId: string, at: Date): Promise<void>;

  spendOpenResetCodes(userId: string, at: Date): Promise<void>;
  addResetCode(code: {
    id: string;
    userId: string;
    codeHash: string;
    expiresAt: Date;
  }): Promise<void>;
  // The newest unspent, unexpired code, locked.
  lockOpenResetCode(userId: string, at: Date): Promise<ResetCodeRecord | null>;
  recordWrongResetCode(id: string, spend: boolean, at: Date): Promise<void>;
  spendResetCode(id: string, at: Date): Promise<void>;
}

export interface PasswordHasher {
  hash(password: string): Promise<string>;
  verify(passwordHash: string, password: string): Promise<boolean>;
}

export const PASSWORD_HASHER = Symbol('PASSWORD_HASHER');
