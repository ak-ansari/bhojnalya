// Every provider the app needs, each instance passed in so tests build fresh ones.
import { QueryClientProvider, type QueryClient } from '@tanstack/react-query';
import type { i18n } from 'i18next';
import type { ReactNode } from 'react';
import { I18nextProvider } from 'react-i18next';

import { SocketProvider } from './SocketProvider';

import type { StaffSocket } from '@/libs/socket/staffSocket';
import { DeviceStoreContext, type DeviceStore } from '@/modules/device/store/deviceStore';

export interface AppProvidersProps {
  queryClient: QueryClient;
  i18n: i18n;
  deviceStore: DeviceStore;
  connectSocket: (() => StaffSocket) | null;
  children: ReactNode;
}

export function AppProviders({
  queryClient,
  i18n,
  deviceStore,
  connectSocket,
  children,
}: AppProvidersProps) {
  return (
    <I18nextProvider i18n={i18n}>
      <QueryClientProvider client={queryClient}>
        <DeviceStoreContext.Provider value={deviceStore}>
          <SocketProvider connect={connectSocket}>{children}</SocketProvider>
        </DeviceStoreContext.Provider>
      </QueryClientProvider>
    </I18nextProvider>
  );
}
