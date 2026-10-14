// Runs the push loop while the till's screens are mounted: on `online`, on
// every staff-socket connect and on its interval (TRD §8.3).
import { useEffect, useMemo } from 'react';

import { createSyncRunner, type SyncRunner } from './syncRunner';

import { useLocalDb } from '@/libs/local-db/LocalDbContext';
import { useStaffSocket } from '@/libs/socket/staffSocket';

export function useSyncRunner(): SyncRunner {
  const db = useLocalDb();
  const socket = useStaffSocket();
  const runner = useMemo(() => createSyncRunner({ db }), [db]);

  useEffect(() => runner.start(), [runner]);

  useEffect(() => {
    if (!socket) return;
    const onConnect = () => void runner.syncNow();
    socket.on('connect', onConnect);
    return () => {
      socket.off('connect', onConnect);
    };
  }, [socket, runner]);

  return runner;
}
