// Renders under the app's real providers, each built fresh: a query client
// with `retry: false`, a device store, real i18n, no socket and a memory
// router. No Dexie database yet; it joins here with the local-first POS.
import type { DeviceRole } from '@bhojnalya/contracts';
import { QueryClient } from '@tanstack/react-query';
import { render, type RenderResult } from '@testing-library/react';
import type { ReactNode } from 'react';
import { createMemoryRouter, RouterProvider, type RouteObject } from 'react-router';

import { AppProviders } from '@/app/AppProviders';
import { appRoutes } from '@/app/routes';
import { createI18n } from '@/libs/i18n/i18n';
import { createDeviceStore, type DeviceStore } from '@/modules/device/store/deviceStore';

export interface RenderOptions {
  /** The device's role before the render; `null` is an unregistered device. */
  role?: DeviceRole | null;
  /** Where the memory router starts. */
  route?: string;
}

export interface Rendered extends RenderResult {
  queryClient: QueryClient;
  deviceStore: DeviceStore;
  router: ReturnType<typeof createMemoryRouter>;
}

/** Renders `ui` as the only route at `route`. */
export function renderWithProviders(ui: ReactNode, options: RenderOptions = {}): Rendered {
  return renderRoutes([{ path: '*', element: ui }], options);
}

/** Renders the app's real route table, starting at `route`. */
export function renderApp(options: RenderOptions = {}): Rendered {
  return renderRoutes(appRoutes, options);
}

function renderRoutes(
  routes: RouteObject[],
  { role = null, route = '/' }: RenderOptions,
): Rendered {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const deviceStore = createDeviceStore({ role });
  const router = createMemoryRouter(routes, { initialEntries: [route] });
  const result = render(
    <AppProviders
      queryClient={queryClient}
      i18n={createI18n()}
      deviceStore={deviceStore}
      connectSocket={null}
    >
      <RouterProvider router={router} />
    </AppProviders>,
  );
  return { ...result, queryClient, deviceStore, router };
}
