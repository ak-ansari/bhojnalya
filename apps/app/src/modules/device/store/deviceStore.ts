// What this device is for (client state, so Zustand). Each provider tree gets
// its own store, so tests never share one. A stub until device pairing lands:
// the role is chosen on the device and kept in localStorage, with no server.
import type { DeviceRole } from '@bhojnalya/contracts';
import { createContext, useContext } from 'react';
import { createStore, useStore, type StoreApi } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export interface DeviceState {
  role: DeviceRole | null;
  register: (role: DeviceRole) => void;
}

export type DeviceStore = StoreApi<DeviceState>;

export const DEVICE_STORAGE_KEY = 'bhojnalya.device';

export function createDeviceStore(
  initial: Pick<DeviceState, 'role'> = { role: null },
): DeviceStore {
  return createStore<DeviceState>()(
    persist(
      (set) => ({
        ...initial,
        register: (role) => {
          set({ role });
        },
      }),
      {
        name: DEVICE_STORAGE_KEY,
        storage: createJSONStorage(() => localStorage),
        partialize: (state) => ({ role: state.role }),
      },
    ),
  );
}

export const DeviceStoreContext = createContext<DeviceStore | null>(null);

export function useDeviceStore<T>(selector: (state: DeviceState) => T): T {
  const store = useContext(DeviceStoreContext);
  if (!store) throw new Error('useDeviceStore needs a DeviceStoreContext provider');
  return useStore(store, selector);
}
