// The outbox (invariant 7, TRD §8.2–8.3): every local change appends one sync
// op, in the same Dexie transaction as the change, with the next deviceSeq.
// An op leaves only when the server acks it; a refused op stays, flagged,
// until staff retry it (ADR 0025).
import { MAX_SYNC_BATCH, SyncOp, type SyncPushResponse } from '@bhojnalya/contracts';
import Dexie, { type Transaction } from 'dexie';
import { z } from 'zod';

import { readMeta, writeMeta, type OutboxRecord, type PosDb } from '@/libs/local-db/db';
import type { LocalDeps } from '@/libs/local-db/deps';

type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;

/** An op as a mutation describes it; the outbox adds opId, createdAt and deviceSeq. */
export type SyncOpDraft = DistributiveOmit<SyncOp, 'opId' | 'createdAt' | 'deviceSeq'>;

/**
 * Appends one op with the next deviceSeq. Must run inside the transaction
 * that writes the record it describes, over `meta` and `outbox`, so the
 * change and its op commit or roll back together. Throws if the op breaks
 * the contract, which aborts that transaction.
 */
export async function appendOp(
  db: PosDb,
  draft: SyncOpDraft,
  deps: LocalDeps,
): Promise<OutboxRecord> {
  if (!(Dexie.currentTransaction as Transaction | null)) {
    throw new Error('appendOp must run inside the transaction that writes its record');
  }
  const deviceSeq = ((await readMeta(db, 'deviceSeq')) ?? 0) + 1;
  const op = {
    ...draft,
    opId: deps.newId(),
    createdAt: deps.now().toISOString(),
    deviceSeq,
  };
  const record: OutboxRecord = {
    deviceSeq,
    opId: op.opId,
    op: z.encode(SyncOp, op),
    rejection: null,
  };
  await writeMeta(db, 'deviceSeq', deviceSeq);
  await db.outbox.add(record);
  return record;
}

/** The next ops to push: not refused, oldest first, at most one batch. */
export function pendingBatch(db: PosDb, limit: number = MAX_SYNC_BATCH): Promise<OutboxRecord[]> {
  return db.outbox
    .orderBy('deviceSeq')
    .filter((record) => record.rejection === null)
    .limit(limit)
    .toArray();
}

/**
 * Applies the server's answer to a pushed batch: acked ops leave the outbox,
 * refused ones stay with the reason. An id the batch did not carry is ignored,
 * and an op the server did not answer for stays as it was.
 */
export function applyPushResult(
  db: PosDb,
  batch: readonly OutboxRecord[],
  response: SyncPushResponse,
  at: Date,
): Promise<PushOutcome> {
  const sent = new Map(batch.map((record) => [record.opId, record.deviceSeq]));
  return db.transaction('rw', db.outbox, async () => {
    const outcome: PushOutcome = { acked: 0, rejected: 0 };
    for (const opId of response.acked) {
      const deviceSeq = sent.get(opId);
      if (deviceSeq === undefined) continue;
      await db.outbox.delete(deviceSeq);
      outcome.acked += 1;
    }
    for (const { opId, reason } of response.rejected) {
      const deviceSeq = sent.get(opId);
      if (deviceSeq === undefined) continue;
      await db.outbox.update(deviceSeq, { rejection: { reason, at: at.toISOString() } });
      outcome.rejected += 1;
    }
    return outcome;
  });
}

export interface PushOutcome {
  acked: number;
  rejected: number;
}

/** Puts every refused op back in line for the next push. */
export function retryRejected(db: PosDb): Promise<number> {
  return db.outbox.filter((record) => record.rejection !== null).modify({ rejection: null });
}

export interface OutboxCounts {
  /** Waiting for the next push. */
  pending: number;
  /** Refused by the server, held until retried. */
  rejected: number;
  /** Everything not yet acked: what blocks sign-out and reset. */
  total: number;
}

export async function countOutbox(db: PosDb): Promise<OutboxCounts> {
  const records = await db.outbox.toArray();
  const rejected = records.filter((record) => record.rejection !== null).length;
  return { pending: records.length - rejected, rejected, total: records.length };
}
