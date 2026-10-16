// Gives the POS route tree the till's database. It is imported only from the
// POS's lazy layout chunk, so a kitchen display never downloads Dexie, and it
// renders before any POS screen, so the database exists before any local write.
import { useContext, type ReactNode } from 'react';

import { PosDb } from './db';
import { LocalDbContext } from './LocalDbContext';

/** A database provided above (tests) wins; otherwise this device's own, one instance per page. */
export function LocalDbScope({ children }: { children: ReactNode }) {
  const provided = useContext(LocalDbContext);
  return (
    <LocalDbContext.Provider value={provided ?? openDeviceDb()}>{children}</LocalDbContext.Provider>
  );
}

let deviceDb: PosDb | undefined;

/** Dexie opens the database on its first query, so creating it costs nothing. */
function openDeviceDb(): PosDb {
  deviceDb ??= new PosDb();
  return deviceDb;
}
