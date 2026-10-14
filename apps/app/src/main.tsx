// Entry point: build the app's single instances, register the service worker,
// render the role-based router.
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router';
import { registerSW } from 'virtual:pwa-register';

import { AppProviders } from './app/AppProviders';
import { appRoutes } from './app/routes';
import './index.css';
import { createQueryClient } from './libs/api/queryClient';
import { createI18n } from './libs/i18n/i18n';
import { PosDb } from './libs/local-db/db';
import { connectStaffSocket } from './libs/socket/staffSocket';
import { createDeviceStore } from './modules/device/store/deviceStore';

// ADR 0022: a new version installs in the background and takes over on the next launch.
registerSW({ immediate: true });

const router = createBrowserRouter(appRoutes);
const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('index.html has no #root element');

createRoot(rootElement).render(
  <StrictMode>
    <AppProviders
      queryClient={createQueryClient()}
      i18n={createI18n()}
      deviceStore={createDeviceStore()}
      localDb={new PosDb()}
      connectSocket={connectStaffSocket}
    >
      <RouterProvider router={router} />
    </AppProviders>
  </StrictMode>,
);
