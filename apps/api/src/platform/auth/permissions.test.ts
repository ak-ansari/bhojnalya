import { describe, expect, it } from 'vitest';

import type { Principal } from '../http/api-request.js';
import { PERMISSIONS, ROLE_PERMISSIONS, can } from './permissions.js';
import { userPrincipal } from './principals.js';

const A = '0190f5b2-6a1c-7c3e-9a4d-2b1f0e9d8c01';
const B = '0190f5b2-6a1c-7c3e-9a4d-2b1f0e9d8c02';
const USER = { userId: 'u', tenantId: 't' };

describe('can', () => {
  it('lets an owner do everything at an outlet they own', () => {
    const owner: Principal = {
      tenantId: 't',
      outletIds: [A],
      roles: [{ outletId: A, role: 'owner' }],
    };
    for (const permission of PERMISSIONS) expect(can(owner, permission, A)).toBe(true);
    expect(ROLE_PERMISSIONS.owner).toEqual(PERMISSIONS);
  });

  it('refuses an outlet the principal holds no role at, and every Phase 2 role for now', () => {
    const owner: Principal = {
      tenantId: 't',
      outletIds: [A],
      roles: [{ outletId: A, role: 'owner' }],
    };
    expect(can(owner, 'devices.manage', B)).toBe(false);
    const cashier: Principal = {
      tenantId: 't',
      outletIds: [A],
      roles: [{ outletId: A, role: 'cashier' }],
    };
    expect(can(cashier, 'devices.manage', A)).toBe(false);
  });

  it('refuses a device, which holds no roles', () => {
    const device: Principal = {
      tenantId: 't',
      outletIds: [A],
      outletId: A,
      deviceId: 'd',
      roles: [],
    };
    expect(can(device, 'devices.manage')).toBe(false);
  });

  it('refuses an outlet outside the reach of this request even where the role is held', () => {
    const narrowed: Principal = {
      tenantId: 't',
      outletIds: [A],
      outletId: A,
      roles: [
        { outletId: A, role: 'owner' },
        { outletId: B, role: 'owner' },
      ],
    };
    expect(can(narrowed, 'devices.manage', B)).toBe(false);
    expect(can(narrowed, 'devices.manage')).toBe(true);
  });
});

describe('userPrincipal', () => {
  const atA = { outletId: A, role: 'owner' as const };
  const grants = [atA, { outletId: B, role: 'owner' as const }];

  it('acts for the only outlet of a one-outlet owner without being told', () => {
    expect(userPrincipal(USER, [atA], undefined)).toMatchObject({ outletIds: [A], outletId: A });
  });

  it('acts for no outlet but reaches all of them when an owner of several names none', () => {
    const principal = userPrincipal(USER, grants, undefined);
    expect(principal).toMatchObject({ outletIds: [A, B] });
    expect(principal).not.toHaveProperty('outletId');
  });

  it('reaches only the named outlet when one is named', () => {
    expect(userPrincipal(USER, grants, B)).toMatchObject({ outletIds: [B], outletId: B });
  });

  it('refuses an outlet the user holds no role at', () => {
    expect(userPrincipal(USER, [atA], B)).toBe('not-your-outlet');
  });
});
