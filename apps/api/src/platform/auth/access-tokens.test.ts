import { SignJWT } from 'jose';
import { describe, expect, it } from 'vitest';

import { AccessTokens } from './access-tokens.js';

const SECRET = new TextEncoder().encode('a-test-secret-that-is-at-least-32-bytes');
const tokens = new AccessTokens(SECRET);
const ISSUED = new Date('2026-10-14T10:00:00Z');
const SUBJECT = {
  userId: '0190f5b2-6a1c-7c3e-9a4d-2b1f0e9d8c7a',
  tenantId: '0190f5b2-6a1c-7c3e-9a4d-2b1f0e9d8c7b',
};

describe('AccessTokens', () => {
  it('issues a token that expires 15 minutes after it is issued', async () => {
    const { expiresAt } = await tokens.issue(SUBJECT, ISSUED);
    expect(expiresAt.toISOString()).toBe('2026-10-14T10:15:00.000Z');
  });

  it('names the user and tenant with a tenant scope, and nothing about outlets', async () => {
    const { token } = await tokens.issue(SUBJECT, ISSUED);
    const claims = await tokens.verify(token, ISSUED);
    expect(claims).toEqual({
      sub: SUBJECT.userId,
      scope: 'tenant',
      tenant_id: SUBJECT.tenantId,
      iat: ISSUED.getTime() / 1000,
      exp: ISSUED.getTime() / 1000 + 900,
    });
  });

  it('is accepted up to its expiry and refused from then on', async () => {
    const { token } = await tokens.issue(SUBJECT, ISSUED);
    expect(await tokens.verify(token, new Date('2026-10-14T10:14:59Z'))).not.toBeNull();
    expect(await tokens.verify(token, new Date('2026-10-14T10:15:00Z'))).toBeNull();
  });

  it('refuses a token signed with another secret, a tampered one, or one with no algorithm', async () => {
    const { token } = await tokens.issue(SUBJECT, ISSUED);
    const other = new AccessTokens(
      new TextEncoder().encode('another-secret-that-is-32-bytes-long'),
    );
    expect(await other.verify(token, ISSUED)).toBeNull();
    const [header, , signature] = token.split('.');
    const forged = Buffer.from(JSON.stringify({ sub: 'x', scope: 'tenant' })).toString('base64url');
    expect(await tokens.verify(`${header ?? ''}.${forged}.${signature ?? ''}`, ISSUED)).toBeNull();
    const none = `${Buffer.from('{"alg":"none"}').toString('base64url')}.${forged}.`;
    expect(await tokens.verify(none, ISSUED)).toBeNull();
  });

  it('refuses a token from this secret whose claims are not ours', async () => {
    const foreign = await new SignJWT({ scope: 'owner' })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject('u')
      .setIssuer('bhojnalya-api')
      .setIssuedAt(ISSUED.getTime() / 1000)
      .setExpirationTime(ISSUED.getTime() / 1000 + 60)
      .sign(SECRET);
    expect(await tokens.verify(foreign, ISSUED)).toBeNull();
  });
});
