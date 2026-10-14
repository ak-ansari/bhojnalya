// Holds the staff socket for a registered device and wires reconnect → refetch.
// No socket is opened before the device has a role, and tests pass none.
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, type ReactNode } from 'react';

import { refetchOnReconnect, type StaffSocket } from '@/libs/socket/staffSocket';
import { useDeviceStore } from '@/modules/device/store/deviceStore';

export interface SocketProviderProps {
  /** Opens a socket; `null` means never connect (tests, previews). */
  connect: (() => StaffSocket) | null;
  children: ReactNode;
}

export function SocketProvider({ connect, children }: SocketProviderProps) {
  const queryClient = useQueryClient();
  const role = useDeviceStore((state) => state.role);

  useEffect(() => {
    if (!connect || !role) return;
    const socket = connect();
    const unsubscribe = refetchOnReconnect(socket, queryClient);
    return () => {
      unsubscribe();
      socket.disconnect();
    };
  }, [connect, role, queryClient]);

  return children;
}
