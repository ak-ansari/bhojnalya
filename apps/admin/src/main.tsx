import './index.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router';

import { AppProviders } from '@/app/AppProviders';
import { ROUTES } from '@/app/routes';
import { createQueryClient } from '@/libs/api/createQueryClient';
import { createI18n } from '@/libs/i18n/createI18n';

const root = document.getElementById('root');
if (!root) throw new Error('index.html has no #root element');

createRoot(root).render(
  <StrictMode>
    <AppProviders queryClient={createQueryClient()} i18n={createI18n()}>
      <RouterProvider router={createBrowserRouter(ROUTES)} />
    </AppProviders>
  </StrictMode>,
);
