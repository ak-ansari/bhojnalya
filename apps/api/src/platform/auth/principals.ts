// Turns a verified bearer into the request's principal by reading the database
// every time (ADR 0027): a disabled user, a changed role or a revoked device
// takes effect on the next request, not when a token expires.
import { devices, resolveDeviceToken, userOutletRoles, users, withTenant } from '@bhojnalya/db';
import type { Db } from '@bhojnalya/db';
import { and, eq, isNull, lt, or, sql } from 'drizzle-orm';

import type { OutletRoleGrant, Principal } from '../http/api-request.js';
import { hashOpaqueToken } from './secrets.js';

// A device's last-seen time is written at most this often, so a busy till
// does not turn every read into a write.
const LAST_SEEN_EVERY = sql`interval '5 minutes'`;

export interface SignedInUser {
  userId: string;
  tenantId: string;
}

// The user's grants, or null when the user is gone or disabled.
export async function userGrants(
  db: Db,
  { userId, tenantId }: SignedInUser,
): Promise<OutletRoleGrant[] | null> {
  // user_outlet_roles is tenant-wide, so no outlet needs to be open to read it.
  return withTenant(db, { tenantId, outletIds: [] }, async (tx) => {
    const [user] = await tx
      .select({ status: users.status })
      .from(users)
      .where(eq(users.id, userId));
    if (user?.status !== 'active') return null;
    return tx
      .select({ outletId: userOutletRoles.outletId, role: userOutletRoles.role })
      .from(userOutletRoles)
      .where(eq(userOutletRoles.userId, userId));
  });
}

// A user acts for the outlet named in X-Outlet-Id, and then reaches only that
// outlet; without one, for its only outlet, or for none if it has several.
export function userPrincipal(
  user: SignedInUser,
  grants: readonly OutletRoleGrant[],
  actingOutletId: string | undefined,
): Principal | 'not-your-outlet' {
  const outletIds = [...new Set(grants.map((g) => g.outletId))];
  const base = { tenantId: user.tenantId, userId: user.userId, roles: grants };
  if (actingOutletId !== undefined) {
    if (!outletIds.includes(actingOutletId)) return 'not-your-outlet';
    return { ...base, outletIds: [actingOutletId], outletId: actingOutletId };
  }
  return outletIds.length === 1
    ? { ...base, outletIds, outletId: outletIds[0] }
    : { ...base, outletIds };
}

// The device holding this token, if it is neither revoked nor retired.
export async function devicePrincipal(db: Db, token: string): Promise<Principal | null> {
  const found = await resolveDeviceToken(db, hashOpaqueToken(token));
  if (!found) return null;
  const { tenantId, outletId, deviceId } = found;
  const active = await withTenant(db, { tenantId, outletIds: [outletId] }, async (tx) => {
    const touched = await tx
      .update(devices)
      .set({ lastSeenAt: sql`now()` })
      .where(
        and(
          eq(devices.id, deviceId),
          isNull(devices.revokedAt),
          isNull(devices.retiredAt),
          or(isNull(devices.lastSeenAt), lt(devices.lastSeenAt, sql`now() - ${LAST_SEEN_EVERY}`)),
        ),
      )
      .returning({ id: devices.id });
    if (touched.length > 0) return true;
    const [row] = await tx
      .select({ id: devices.id })
      .from(devices)
      .where(and(eq(devices.id, deviceId), isNull(devices.revokedAt), isNull(devices.retiredAt)));
    return row !== undefined;
  });
  return active ? { tenantId, outletIds: [outletId], outletId, deviceId, roles: [] } : null;
}
