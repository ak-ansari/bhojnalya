// The staff Socket.io connection (TRD §9). A socket event is a notification,
// never data (ADR 0010): the client refetches through TanStack Query, and on
// every (re)connect it refetches everything on screen, because events sent
// while it was away are gone.
import type { SocketEventListeners } from '@bhojnalya/contracts';
import type { QueryClient } from '@tanstack/react-query';
import { io, type Socket } from 'socket.io-client';

import { STAFF_SOCKET_NAMESPACE } from '@/libs/api/endpoints';

/** Server → client events are the contract's typed notifications; the client emits none yet. */
export type StaffSocket = Socket<SocketEventListeners>;

/** The part of a socket the refetch wiring needs, so tests can pass a fake. */
export type ConnectEmitter = Pick<StaffSocket, 'on' | 'off'>;

/**
 * Invalidates every query each time the socket connects. The first connect
 * counts too: a till that started offline has queries that failed and must
 * refetch. Returns the unsubscribe.
 */
export function refetchOnReconnect(socket: ConnectEmitter, queryClient: QueryClient): () => void {
  const onConnect = () => {
    void queryClient.invalidateQueries();
  };
  socket.on('connect', onConnect);
  return () => {
    socket.off('connect', onConnect);
  };
}

/** Opens the staff namespace on this page's origin. Device auth is added with device pairing. */
export function connectStaffSocket(): StaffSocket {
  return io(STAFF_SOCKET_NAMESPACE, { transports: ['websocket'] });
}
