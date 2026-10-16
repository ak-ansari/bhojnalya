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
  /** Forgets the role; callers clear the local data first (safety rails). */
  unregister: () => void;
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
        unregister: () => {
          set({ role: null });
        },
      }),
      {
        name: DEVICE_STORAGE_KEY,
        storage: createJSONStorage(() => localStorage),
        partialize: (state) => ({ role: state.role }),
        // Storage is outside the app's control: anything but a known role is unregistered.
        // Nothing stored (`undefined`) keeps the role the store was created with.
        merge: (persisted, current) =>
          persisted === undefined ? current : { ...current, role: storedRole(persisted) },
      },
    ),
  );
}

function storedRole(persisted: unknown): DeviceRole | null {
  if (typeof persisted !== 'object' || persisted === null) return null;
  const { role } = persisted as { role?: unknown };
  return isDeviceRole(role) ? role : null;
}

/**
 * The contract's `DeviceRole` values, written out so the entry chunk every
 * device loads does not pull in zod (about 26 KB gz). A unit test holds this
 * list equal to the schema's.
 */
export const DEVICE_ROLES: readonly DeviceRole[] = ['pos', 'kds'];

export function isDeviceRole(value: unknown): value is DeviceRole {
  return DEVICE_ROLES.includes(value as DeviceRole);
}

export const DeviceStoreContext = createContext<DeviceStore | null>(null);

export function useDeviceStore<T>(selector: (state: DeviceState) => T): T {
  const store = useContext(DeviceStoreContext);
  if (!store) throw new Error('useDeviceStore needs a DeviceStoreContext provider');
  return useStore(store, selector);
}
