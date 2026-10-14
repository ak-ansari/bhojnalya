import type { DeviceRole } from '@bhojnalya/contracts';

export const ROUTES = {
  REGISTER: '/register',
  POS: '/pos',
  KDS: '/kds',
} as const;

/** Where a device of this role lands. */
export function roleHome(role: DeviceRole): string {
  return role === 'pos' ? ROUTES.POS : ROUTES.KDS;
}
