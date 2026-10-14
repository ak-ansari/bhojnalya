// Guards a role's route tree: an unregistered device goes to registration, and
// a device of the other role goes to its own screens.
import type { DeviceRole } from '@bhojnalya/contracts';
import { Navigate, Outlet } from 'react-router';

import { ROUTES, roleHome } from './paths';

import { useDeviceStore } from '@/modules/device/store/deviceStore';

export function RequireRole({ role }: { role: DeviceRole }) {
  const deviceRole = useDeviceStore((state) => state.role);
  if (!deviceRole) return <Navigate to={ROUTES.REGISTER} replace />;
  if (deviceRole !== role) return <Navigate to={roleHome(deviceRole)} replace />;
  return <Outlet />;
}
