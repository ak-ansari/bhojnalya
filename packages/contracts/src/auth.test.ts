import { describe, expect, it } from 'vitest';

import {
  AccessClaims,
  DeviceCode,
  LoginRequest,
  PasswordResetConfirm,
  RegisterDeviceRequest,
} from './auth.js';

const OUTLET = '0190f5b2-6a1c-7c3e-9a4d-2b1f0e9d8c7a';

describe('LoginRequest', () => {
  it('takes an email or phone and a password, trimming the login', () => {
    expect(LoginRequest.parse({ login: '  owner@chai.in ', password: 'p' })).toEqual({
      login: 'owner@chai.in',
      password: 'p',
    });
  });

  it('refuses an empty password', () => {
    expect(LoginRequest.safeParse({ login: 'owner@chai.in', password: '' }).success).toBe(false);
  });
});

describe('PasswordResetConfirm', () => {
  it('needs a six-digit code and a new password of at least 8 characters', () => {
    const ok = { email: 'owner@chai.in', code: '004217', newPassword: 'masala-chai' };
    expect(PasswordResetConfirm.safeParse(ok).success).toBe(true);
    expect(PasswordResetConfirm.safeParse({ ...ok, code: '4217' }).success).toBe(false);
    expect(PasswordResetConfirm.safeParse({ ...ok, newPassword: 'short' }).success).toBe(false);
  });
});

describe('AccessClaims', () => {
  it('reads a tenant token with its literal scope', () => {
    const claims = { sub: OUTLET, scope: 'tenant', tenant_id: OUTLET, iat: 1, exp: 901 };
    expect(AccessClaims.parse(claims)).toEqual(claims);
    expect(AccessClaims.safeParse({ ...claims, scope: 'owner' }).success).toBe(false);
  });
});

describe('DeviceCode', () => {
  it('is two characters 0-9 or A-Z', () => {
    expect(DeviceCode.safeParse('0A').success).toBe(true);
    expect(DeviceCode.safeParse('0a').success).toBe(false);
    expect(DeviceCode.safeParse('A').success).toBe(false);
  });
});

describe('RegisterDeviceRequest', () => {
  it('needs a client-made UUIDv7 id, an outlet and a role', () => {
    const ok = { id: '0190f5b2-6a1c-7c3e-9a4d-2b1f0e9d8c7b', outletId: OUTLET, role: 'pos' };
    expect(RegisterDeviceRequest.safeParse(ok).success).toBe(true);
    expect(
      RegisterDeviceRequest.safeParse({ ...ok, id: '1b4e28ba-2fa1-41d2-883f-0016d3cca427' })
        .success,
    ).toBe(false);
    expect(RegisterDeviceRequest.safeParse({ ...ok, role: 'printer' }).success).toBe(false);
  });
});
