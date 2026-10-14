// Whether billing is blocked because the device clock reads earlier than the
// last invoice (invariant 6, ADR 0007). The rule is the engine's own guard;
// the clock is re-read every few seconds so the block lifts once it is fixed.
import { assertClockNotBehind, ClockBehindError } from '@bhojnalya/billing';
import { useLiveQuery } from '@/libs/local-db/useLiveQuery';
import { useEffect, useState } from 'react';

import { readMeta } from '@/libs/local-db/db';
import { useLocalDb } from '@/libs/local-db/LocalDbContext';

export const CLOCK_RECHECK_MS = 5_000;

export interface ClockStatus {
  behind: boolean;
  lastInvoiceAt: string | null;
}

export function useClockBehind(): ClockStatus {
  const db = useLocalDb();
  const lastInvoiceAt = useLiveQuery(() => readMeta(db, 'lastInvoiceAt'), [db]) ?? null;
  const now = useNow(CLOCK_RECHECK_MS);
  return { behind: isBehind(now, lastInvoiceAt), lastInvoiceAt };
}

function isBehind(now: number, lastInvoiceAt: string | null): boolean {
  try {
    assertClockNotBehind(new Date(now), lastInvoiceAt ? new Date(lastInvoiceAt) : null);
    return false;
  } catch (error) {
    if (error instanceof ClockBehindError) return true;
    throw error;
  }
}

function useNow(everyMs: number): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(Date.now());
    }, everyMs);
    return () => {
      window.clearInterval(timer);
    };
  }, [everyMs]);
  return now;
}
