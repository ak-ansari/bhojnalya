// Losing the outbox is prevented, not recovered from (ADR 0006, TRD §8.2):
// sign-out, clearing data and resetting the device are refused while any op
// is waiting, whether or not the server refused it.
import type { PosDb } from '@/libs/local-db/db';

export class OutboxNotEmptyError extends Error {
  readonly code = 'OUTBOX_NOT_EMPTY';
  override readonly name = 'OutboxNotEmptyError';

  constructor(readonly waiting: number) {
    super(`${String(waiting)} change(s) have not synced yet`);
  }
}

/** Throws `OutboxNotEmptyError` while anything is waiting. Sign-out calls this first. */
export async function assertOutboxEmpty(db: PosDb): Promise<void> {
  const waiting = await db.outbox.count();
  if (waiting > 0) throw new OutboxNotEmptyError(waiting);
}

/**
 * Wipes every local table, the device identity and its invoice counters
 * included, so the device must be paired again and gets a new device code:
 * a kept code with a wiped counter would reuse invoice numbers (ADR 0007).
 * The check and the wipe are one transaction, so an op appended meanwhile
 * either blocks it or waits for it.
 */
export function clearLocalData(db: PosDb): Promise<void> {
  return db.transaction('rw', db.allTables, async () => {
    await assertOutboxEmpty(db);
    await Promise.all(db.allTables.map((table) => table.clear()));
  });
}
