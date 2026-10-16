// What a role may do (TRD §13). Routes ask for a permission, never a role, so
// Phase 2 staff roles plug in by filling their lists, with no route changes.
import type { OutletRole } from '@bhojnalya/contracts';

import type { Principal } from '../http/api-request.js';

export const PERMISSIONS = [
  'devices.manage',
  'menu.manage',
  'orders.manage',
  'billing.manage',
  'reports.view',
  'outlet.settings',
  'users.manage',
] as const;
export type Permission = (typeof PERMISSIONS)[number];

// The MVP grants only `owner`. The other roles exist in the schema and get
// their lists when staff logins ship (PRD §6).
export const ROLE_PERMISSIONS: Readonly<Record<OutletRole, readonly Permission[]>> = {
  owner: PERMISSIONS,
  manager: [],
  cashier: [],
  captain: [],
  kitchen: [],
};

// Whether the principal holds the permission at the outlet; with no outlet
// named, at the outlet it acts for, or at any of its outlets when it acts for
// none. A named outlet must also be one this request reaches (X-Outlet-Id
// narrows the reach to one outlet, not the grants).
export function can(principal: Principal, permission: Permission, outletId?: string): boolean {
  if (outletId !== undefined && !principal.outletIds.includes(outletId)) return false;
  const at = outletId ?? principal.outletId;
  return (principal.roles ?? []).some(
    (grant) =>
      (at === undefined || grant.outletId === at) &&
      ROLE_PERMISSIONS[grant.role].includes(permission),
  );
}
