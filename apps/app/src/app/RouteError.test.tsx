import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { reloadPage } from '@/libs/browser/reloadPage';
import { countOutbox } from '@/libs/sync/outbox';
import { DEVICE_STORAGE_KEY } from '@/modules/device/store/deviceStore';
import { createTestDb, seedOps, testDeps } from '@/testing/localDb';
import { renderApp } from '@/testing/renderWithProviders';

// A route chunk that cannot be fetched: offline before it was cached, or a
// stale client asking for a file the last deploy removed.
vi.mock('@/modules/kds/components/KdsLayout', () => {
  throw new TypeError('Failed to fetch dynamically imported module');
});
vi.mock('@/modules/pos/components/PosLayout', () => {
  throw new TypeError('Failed to fetch dynamically imported module');
});
vi.mock('@/libs/browser/reloadPage', () => ({ reloadPage: vi.fn() }));

describe('a screen that fails to load', () => {
  // The fallback logs the error it caught; keep the test output readable.
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  it.each(['kds', 'pos'] as const)(
    'shows the branded fallback with a reload on the %s, not the router error page',
    async (role) => {
      const user = userEvent.setup();
      renderApp({ role, route: `/${role}` });

      expect(
        await screen.findByRole('heading', { name: "This screen didn't load." }),
      ).toBeInTheDocument();
      expect(screen.queryByText(/Unexpected Application Error/)).toBeNull();

      await user.click(screen.getByRole('button', { name: 'Reload' }));
      expect(reloadPage).toHaveBeenCalledOnce();
    },
  );

  it('keeps unsynced changes and the device role when the fallback shows and reloads', async () => {
    const user = userEvent.setup();
    const db = createTestDb();
    await seedOps(db, 2, testDeps());
    const { deviceStore } = renderApp({ role: 'pos', route: '/pos', db });
    const storedRole = localStorage.getItem(DEVICE_STORAGE_KEY);

    await user.click(await screen.findByRole('button', { name: 'Reload' }));

    expect(await countOutbox(db)).toEqual({ pending: 2, rejected: 0, total: 2 });
    expect(deviceStore.getState().role).toBe('pos');
    expect(localStorage.getItem(DEVICE_STORAGE_KEY)).toBe(storedRole);
    expect(
      screen.getByText('Nothing saved on this tablet was lost. Check the internet, then reload.'),
    ).toBeInTheDocument();
  });
});
