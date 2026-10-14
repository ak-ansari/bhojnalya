import { useQuery } from '@tanstack/react-query';
import { act, screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { refetchOnReconnect, type ConnectEmitter } from './staffSocket';

import { apiGet } from '@/libs/api/client';
import { server } from '@/mocks/server';
import { renderWithProviders } from '@/testing/renderWithProviders';

// A test-only resource: the wiring is generic, so any query on screen will do.
const PROBE_PATH = '/api/v1/test-probe';

describe('refetchOnReconnect', () => {
  it('refetches what is on screen each time the socket connects', async () => {
    let served = 0;
    server.use(
      http.get(PROBE_PATH, () => {
        served += 1;
        return HttpResponse.json({ version: served });
      }),
    );
    const socket = new FakeSocket();
    const { queryClient } = renderWithProviders(<Probe />);
    expect(await screen.findByText('version 1')).toBeInTheDocument();

    refetchOnReconnect(socket, queryClient);
    act(() => {
      socket.emit('connect');
    });
    expect(await screen.findByText('version 2')).toBeInTheDocument();

    act(() => {
      socket.emit('connect');
    });
    expect(await screen.findByText('version 3')).toBeInTheDocument();
  });

  it('stops refetching once unsubscribed', async () => {
    let served = 0;
    server.use(
      http.get(PROBE_PATH, () => {
        served += 1;
        return HttpResponse.json({ version: served });
      }),
    );
    const socket = new FakeSocket();
    const { queryClient } = renderWithProviders(<Probe />);
    expect(await screen.findByText('version 1')).toBeInTheDocument();

    const unsubscribe = refetchOnReconnect(socket, queryClient);
    unsubscribe();
    act(() => {
      socket.emit('connect');
    });

    expect(socket.listenerCount()).toBe(0);
    expect(served).toBe(1);
  });
});

function Probe() {
  const { data } = useQuery({
    queryKey: ['test-probe'],
    queryFn: () => apiGet(PROBE_PATH, (body) => body as { version: number }),
    staleTime: Infinity,
  });
  return <p>{data ? `version ${String(data.version)}` : 'loading'}</p>;
}

/** Just enough of a Socket.io client to fire `connect` by hand. */
class FakeSocket implements ConnectEmitter {
  private listeners = new Set<() => void>();

  on: ConnectEmitter['on'] = (...[, listener]: Parameters<ConnectEmitter['on']>) => {
    this.listeners.add(listener as () => void);
    return this as never;
  };

  off: ConnectEmitter['off'] = (...[, listener]: Parameters<ConnectEmitter['off']>) => {
    this.listeners.delete(listener as () => void);
    return this as never;
  };

  /** Socket.io fires `connect` on the first connection and on every reconnection. */
  emit(event: 'connect') {
    expect(event).toBe('connect');
    for (const listener of this.listeners) listener();
  }

  listenerCount() {
    return this.listeners.size;
  }
}
