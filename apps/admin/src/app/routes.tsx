// The route tree. Wiring only: each screen lives in its module.
import { Navigate } from 'react-router';
import type { RouteObject } from 'react-router';

import { NotFoundPage } from '@/libs/components/NotFoundPage';
import { LoginPage } from '@/modules/auth/pages/LoginPage';
import { OwnerDashboardPage } from '@/modules/owner/pages/OwnerDashboardPage';
import { OwnerLayout } from '@/modules/owner/pages/OwnerLayout';
import { OwnerMenuPage } from '@/modules/owner/pages/OwnerMenuPage';
import { OwnerReportsPage } from '@/modules/owner/pages/OwnerReportsPage';
import { PlatformLayout } from '@/modules/platform/pages/PlatformLayout';
import { PlatformOutletsPage } from '@/modules/platform/pages/PlatformOutletsPage';

import { ROUTE_PATHS } from '@/libs/routing/routePaths';

export const ROUTES: RouteObject[] = [
  { path: '/', element: <Navigate to={ROUTE_PATHS.OWNER.DASHBOARD} replace /> },
  { path: ROUTE_PATHS.LOGIN, element: <LoginPage /> },
  {
    path: ROUTE_PATHS.OWNER.ROOT,
    element: <OwnerLayout />,
    children: [
      { index: true, element: <Navigate to={ROUTE_PATHS.OWNER.DASHBOARD} replace /> },
      { path: ROUTE_PATHS.OWNER.DASHBOARD, element: <OwnerDashboardPage /> },
      { path: ROUTE_PATHS.OWNER.MENU, element: <OwnerMenuPage /> },
      { path: ROUTE_PATHS.OWNER.REPORTS, element: <OwnerReportsPage /> },
    ],
  },
  {
    path: ROUTE_PATHS.PLATFORM.ROOT,
    element: <PlatformLayout />,
    children: [
      { index: true, element: <Navigate to={ROUTE_PATHS.PLATFORM.OUTLETS} replace /> },
      { path: ROUTE_PATHS.PLATFORM.OUTLETS, element: <PlatformOutletsPage /> },
    ],
  },
  { path: '*', element: <NotFoundPage /> },
];
