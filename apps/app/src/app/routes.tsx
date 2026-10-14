// The app's route table: one tree per device role (ADR 0013). Each role's tree
// is a lazy chunk, so a kitchen display never loads the till's modules.
import { Navigate, type RouteObject } from 'react-router';

import { ROUTES, roleHome } from './paths';
import { RequireRole } from './RequireRole';
import { RouteFallback } from './RouteFallback';

import { DeviceRegistrationPage } from '@/modules/device/pages/DeviceRegistrationPage';
import { useDeviceStore } from '@/modules/device/store/deviceStore';

export const appRoutes: RouteObject[] = [
  { path: '/', element: <HomeRedirect /> },
  { path: ROUTES.REGISTER, element: <DeviceRegistrationPage /> },
  {
    path: ROUTES.POS,
    element: <RequireRole role="pos" />,
    hydrateFallbackElement: <RouteFallback />,
    children: [
      {
        lazy: async () => ({
          Component: (await import('@/modules/pos/components/PosLayout')).PosLayout,
        }),
        children: [
          {
            index: true,
            lazy: async () => ({
              Component: (await import('@/modules/pos/pages/PosHomePage')).PosHomePage,
            }),
          },
          {
            path: 'device',
            lazy: async () => ({
              Component: (await import('@/modules/pos/pages/PosDevicePage')).PosDevicePage,
            }),
          },
        ],
      },
    ],
  },
  {
    path: ROUTES.KDS,
    element: <RequireRole role="kds" />,
    hydrateFallbackElement: <RouteFallback />,
    children: [
      {
        lazy: async () => ({
          Component: (await import('@/modules/kds/components/KdsLayout')).KdsLayout,
        }),
        children: [
          {
            index: true,
            lazy: async () => ({
              Component: (await import('@/modules/kds/pages/KdsHomePage')).KdsHomePage,
            }),
          },
        ],
      },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
];

/** `/` sends a registered device to its role's screens, anything else to registration. */
function HomeRedirect() {
  const role = useDeviceStore((state) => state.role);
  return <Navigate to={role ? roleHome(role) : ROUTES.REGISTER} replace />;
}
