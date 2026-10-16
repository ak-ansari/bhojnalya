import { DeviceRole } from '@bhojnalya/contracts';
import { describe, expect, it } from 'vitest';

import { createDeviceStore, DEVICE_ROLES, DEVICE_STORAGE_KEY, isDeviceRole } from './deviceStore';

describe('createDeviceStore', () => {
  it('starts unregistered', () => {
    expect(createDeviceStore().getState().role).toBeNull();
  });

  it('remembers the chosen role across a reload of the app', () => {
    createDeviceStore().getState().register('kds');

    expect(localStorage.getItem(DEVICE_STORAGE_KEY)).toContain('"role":"kds"');
    expect(createDeviceStore().getState().role).toBe('kds');
  });

  it("accepts exactly the contract's device roles", () => {
    expect(DEVICE_ROLES).toEqual(DeviceRole.options);
    for (const value of [...DeviceRole.options, 'admin', 'POS', '', 123, null, undefined, {}]) {
      expect(isDeviceRole(value)).toBe(DeviceRole.safeParse(value).success);
    }
  });

  it.each([
    ['an unknown role', '{"state":{"role":"admin"},"version":0}'],
    ['a role that is not a string', '{"state":{"role":123},"version":0}'],
    ['no state', '{"state":null}'],
    ['text that is not JSON', 'not json'],
  ])('treats a stored value with %s as unregistered', (_, stored) => {
    localStorage.setItem(DEVICE_STORAGE_KEY, stored);

    expect(createDeviceStore().getState().role).toBeNull();
  });
});
