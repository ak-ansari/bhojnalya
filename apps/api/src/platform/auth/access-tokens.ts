// Access tokens (TRD §13): an HS256 JWT that lives 15 minutes and names only
// who signed in and for which tenant. What they may reach is read from the
// database on every request (ADR 0027), so the token carries no outlets or roles.
import { AccessClaims } from '@bhojnalya/contracts';
import { Inject, Injectable } from '@nestjs/common';
import { SignJWT, jwtVerify } from 'jose';

export const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;

export const AUTH_SECRET = Symbol('AUTH_SECRET');

const ISSUER = 'bhojnalya-api';
const ALGORITHM = 'HS256';

export interface IssuedAccessToken {
  token: string;
  expiresAt: Date;
}

@Injectable()
export class AccessTokens {
  constructor(@Inject(AUTH_SECRET) private readonly secret: Uint8Array) {}

  async issue(
    subject: { userId: string; tenantId: string },
    now: Date,
  ): Promise<IssuedAccessToken> {
    const iat = Math.floor(now.getTime() / 1000);
    const exp = iat + ACCESS_TOKEN_TTL_SECONDS;
    const token = await new SignJWT({ scope: 'tenant', tenant_id: subject.tenantId })
      .setProtectedHeader({ alg: ALGORITHM, typ: 'JWT' })
      .setSubject(subject.userId)
      .setIssuer(ISSUER)
      .setIssuedAt(iat)
      .setExpirationTime(exp)
      .sign(this.secret);
    return { token, expiresAt: new Date(exp * 1000) };
  }

  // The claims of a token this API signed and that has not expired at `now`;
  // null for anything else, so every failure reads the same to the caller.
  async verify(token: string, now: Date): Promise<AccessClaims | null> {
    try {
      const { payload } = await jwtVerify(token, this.secret, {
        algorithms: [ALGORITHM],
        issuer: ISSUER,
        currentDate: now,
      });
      const claims = AccessClaims.safeParse(payload);
      return claims.success ? claims.data : null;
    } catch {
      return null;
    }
  }
}
