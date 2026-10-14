// Renders the real route tree at a URL with fresh providers: a query client
// that does not retry, real English copy, and an optional access token.
import { render } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';

import { AppProviders } from '@/app/AppProviders';
import { ROUTES } from '@/app/routes';
import { createQueryClient } from '@/libs/api/createQueryClient';
import { createI18n } from '@/libs/i18n/createI18n';

export function renderWithProviders(url: string, options: { accessToken?: string } = {}) {
  const router = createMemoryRouter(ROUTES, { initialEntries: [url] });
  const result = render(
    <AppProviders
      queryClient={createQueryClient({ retry: false })}
      i18n={createI18n()}
      initialToken={options.accessToken ?? null}
    >
      <RouterProvider router={router} />
    </AppProviders>,
  );
  return { ...result, router };
}
