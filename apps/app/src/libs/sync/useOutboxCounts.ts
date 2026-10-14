import { useLiveQuery } from '@/libs/local-db/useLiveQuery';

import { countOutbox, type OutboxCounts } from './outbox';

import { useLocalDb } from '@/libs/local-db/LocalDbContext';

/** Live counts of what has not synced; `undefined` until the first read. */
export function useOutboxCounts(): OutboxCounts | undefined {
  const db = useLocalDb();
  return useLiveQuery(() => countOutbox(db), [db]);
}
