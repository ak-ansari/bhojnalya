import { describe, expect, it } from 'vitest';

import { createDeviceStore, DEVICE_STORAGE_KEY } from './deviceStore';

describe('createDeviceStore', () => {
  it('starts unregistered', () => {
    expect(createDeviceStore().getState().role).toBeNull();
  });

  it('remembers the chosen role across a reload of the app', () => {
    createDeviceStore().getState().register('kds');

    expect(localStorage.getItem(DEVICE_STORAGE_KEY)).toContain('"role":"kds"');
    expect(createDeviceStore().getState().role).toBe('kds');
  });
});
