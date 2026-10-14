// The one PosDb instance for the provider tree; tests pass a fresh in-memory one.
import { createContext, useContext } from 'react';

import type { PosDb } from './db';

export const LocalDbContext = createContext<PosDb | null>(null);

export function useLocalDb(): PosDb {
  const db = useContext(LocalDbContext);
  if (!db) throw new Error('useLocalDb needs a LocalDbContext provider');
  return db;
}
