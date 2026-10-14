import { describe, expect, it } from 'vitest';

import { makeAccessToken } from '@/testing/makeAccessToken';

import { decodeAccessClaims, isImpersonating } from './accessClaims';

describe('decodeAccessClaims', () => {
  it('reads the claims from the payload of a signed token', () => {
    const token = makeAccessToken({ sub: 'user-1', tenant_id: 'tenant-1' });
    expect(decodeAccessClaims(token)).toEqual({ sub: 'user-1', tenant_id: 'tenant-1' });
  });

  it('reads a payload that uses the URL-safe base64 alphabet and non-ASCII text', () => {
    const token = makeAccessToken({ sub: 'ñ?>?>~~~', scope: 'ग्राहक' });
    expect(decodeAccessClaims(token)).toEqual({ sub: 'ñ?>?>~~~', scope: 'ग्राहक' });
  });

  it('gives no claims for a missing, malformed or foreign token', () => {
    expect(decodeAccessClaims(null)).toBeNull();
    expect(decodeAccessClaims('')).toBeNull();
    expect(decodeAccessClaims('not-a-jwt')).toBeNull();
    expect(decodeAccessClaims('a.%%%.c')).toBeNull();
    expect(decodeAccessClaims(makeAccessToken({ tenant_id: 'no-subject' }))).toBeNull();
  });
});

describe('isImpersonating', () => {
  it('is true only when the token names who is acting on the owner’s behalf', () => {
    expect(
      isImpersonating(
        decodeAccessClaims(makeAccessToken({ sub: 'u', impersonated_by: 'admin-7' })),
      ),
    ).toBe(true);
    expect(isImpersonating(decodeAccessClaims(makeAccessToken({ sub: 'u' })))).toBe(false);
    expect(isImpersonating(null)).toBe(false);
  });
});
