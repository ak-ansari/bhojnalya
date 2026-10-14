import { renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { useSyncRunner } from './useSyncRunner';

import { API_ENDPOINTS } from '@/libs/api/endpoints';
import { LocalDbContext } from '@/libs/local-db/LocalDbContext';
import { StaffSocketContext, type StaffSocket } from '@/libs/socket/staffSocket';
import { server } from '@/mocks/server';
import { createTestDb, pairDevice, seedOps, testDeps } from '@/testing/localDb';

describe('useSyncRunner', () => {
  it('pushes the outbox each time the staff socket connects', async () => {
    const db = createTestDb();
    await pairDevice(db);
    await seedOps(db, 2, testDeps());
    let pushes = 0;
    server.use(
      http.post(API_ENDPOINTS.SYNC.PUSH, () => {
        pushes += 1;
        return HttpResponse.json({ acked: [], rejected: [] });
      }),
    );
    const handlers = new Map<string, () => void>();
    const socket = {
      on: (event: string, handler: () => void) => handlers.set(event, handler),
      off: (event: string) => handlers.delete(event),
    } as unknown as StaffSocket;
    // Offline at mount, so the first round pushes nothing and only the connect can.
    const onLine = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    const wrapper = ({ children }: { children: ReactNode }) => (
      <LocalDbContext.Provider value={db}>
        <StaffSocketContext.Provider value={socket}>{children}</StaffSocketContext.Provider>
      </LocalDbContext.Provider>
    );
    const { unmount } = renderHook(() => useSyncRunner(), { wrapper });
    await waitFor(() => {
      expect(handlers.has('connect')).toBe(true);
    });
    onLine.mockReturnValue(true);

    handlers.get('connect')?.();

    await waitFor(() => {
      expect(pushes).toBe(1);
    });
    unmount();
    expect(handlers.has('connect')).toBe(false);
  });
});
