// Holds the staff socket for a registered device and wires reconnect → refetch.
// No socket is opened before the device has a role, and tests pass none.
// The open socket is shared through context so the POS sync runner can push
// on every connect (TRD §8.3).
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState, type ReactNode } from 'react';

import {
  refetchOnReconnect,
  StaffSocketContext,
  type StaffSocket,
} from '@/libs/socket/staffSocket';
import { useDeviceStore } from '@/modules/device/store/deviceStore';

export interface SocketProviderProps {
  /** Opens a socket; `null` means never connect (tests, previews). */
  connect: (() => StaffSocket) | null;
  children: ReactNode;
}

export function SocketProvider({ connect, children }: SocketProviderProps) {
  const queryClient = useQueryClient();
  const role = useDeviceStore((state) => state.role);
  const [socket, setSocket] = useState<StaffSocket | null>(null);

  useEffect(() => {
    if (!connect || !role) return;
    const opened = connect();
    const unsubscribe = refetchOnReconnect(opened, queryClient);
    setSocket(opened);
    return () => {
      unsubscribe();
      opened.disconnect();
      setSocket(null);
    };
  }, [connect, role, queryClient]);

  return <StaffSocketContext.Provider value={socket}>{children}</StaffSocketContext.Provider>;
}
