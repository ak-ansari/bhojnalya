// Wiring only: server state, copy and the session, around whatever router the
// caller supplies (the browser router in main, a memory router in tests).
import { QueryClientProvider } from '@tanstack/react-query';
import type { QueryClient } from '@tanstack/react-query';
import type { i18n } from 'i18next';
import type { ReactNode } from 'react';
import { I18nextProvider } from 'react-i18next';

import { SessionProvider } from '@/libs/auth/session';

export function AppProviders({
  queryClient,
  i18n,
  initialToken = null,
  children,
}: {
  queryClient: QueryClient;
  i18n: i18n;
  initialToken?: string | null;
  children: ReactNode;
}) {
  return (
    <QueryClientProvider client={queryClient}>
      <I18nextProvider i18n={i18n}>
        <SessionProvider initialToken={initialToken}>{children}</SessionProvider>
      </I18nextProvider>
    </QueryClientProvider>
  );
}
