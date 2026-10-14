// Two route groups: `/owner/*` for the outlet owner, `/platform/*` for the
// super admin (TRD §4.3).
export const ROUTE_PATHS = {
  LOGIN: '/login',
  OWNER: {
    ROOT: '/owner',
    DASHBOARD: '/owner/dashboard',
    MENU: '/owner/menu',
    REPORTS: '/owner/reports',
  },
  PLATFORM: {
    ROOT: '/platform',
    OUTLETS: '/platform/outlets',
  },
} as const;
