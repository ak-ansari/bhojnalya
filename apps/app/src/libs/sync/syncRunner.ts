// The push loop (invariant 7, TRD §8.3): sends the outbox to the server in
// deviceSeq order, at most 200 ops a batch, and removes only what is acked.
// It runs when the network comes back, when the staff socket connects, and
// every 15 s while anything is waiting. A failed push changes nothing; the
// next trigger sends the same ops again, and the server's op-id idempotency
// makes the repeat harmless.
import { newId, SyncPushResponse, type SyncPushRequestWire } from '@bhojnalya/contracts';

import { applyPushResult, countOutbox, pendingBatch } from './outbox';

import { apiPost } from '@/libs/api/client';
import { API_ENDPOINTS } from '@/libs/api/endpoints';
import { readMeta, type PosDb } from '@/libs/local-db/db';

export const SYNC_INTERVAL_MS = 15_000;

/** Sends one batch and returns the server's answer; throws if there is none. */
export type PushBatch = (request: SyncPushRequestWire) => Promise<SyncPushResponse>;

export interface SyncRound {
  /** `unpaired`: no device identity yet; `offline`: no network; `failed`: a push threw. */
  status: 'done' | 'unpaired' | 'offline' | 'failed';
  acked: number;
  rejected: number;
  error?: unknown;
}

export interface SyncRunner {
  /** Pushes until nothing is pending. A call during a round joins that round. */
  syncNow: () => Promise<SyncRound>;
  /** Wires the triggers and runs one round; returns the teardown. */
  start: () => () => void;
}

export interface SyncRunnerOptions {
  db: PosDb;
  push?: PushBatch;
  now?: () => Date;
  isOnline?: () => boolean;
  intervalMs?: number;
}

export function createSyncRunner({
  db,
  push = httpPush,
  now = () => new Date(),
  isOnline = () => navigator.onLine,
  intervalMs = SYNC_INTERVAL_MS,
}: SyncRunnerOptions): SyncRunner {
  let inFlight: Promise<SyncRound> | null = null;

  const syncNow = () => {
    inFlight ??= runRound({ db, push, now, isOnline }).finally(() => {
      inFlight = null;
    });
    return inFlight;
  };

  const start = () => {
    const onOnline = () => void syncNow();
    window.addEventListener('online', onOnline);
    const timer = window.setInterval(() => {
      void countOutbox(db).then(({ pending }) => (pending > 0 ? syncNow() : undefined));
    }, intervalMs);
    void syncNow();
    return () => {
      window.removeEventListener('online', onOnline);
      window.clearInterval(timer);
    };
  };

  return { syncNow, start };
}

/** POST /sync/push through the app's fetch client, parsed by the contract. */
export const httpPush: PushBatch = (request) =>
  apiPost(API_ENDPOINTS.SYNC.PUSH, request, (body) => SyncPushResponse.parse(body), newId());

type RoundDeps = Required<Pick<SyncRunnerOptions, 'db' | 'push' | 'now' | 'isOnline'>>;

async function runRound({ db, push, now, isOnline }: RoundDeps): Promise<SyncRound> {
  const round: SyncRound = { status: 'done', acked: 0, rejected: 0 };
  try {
    const device = await readMeta(db, 'device');
    if (!device) return { ...round, status: 'unpaired' };
    if (!isOnline()) return { ...round, status: 'offline' };
    for (;;) {
      const batch = await pendingBatch(db);
      if (batch.length === 0) return round;
      const response = await push({ deviceId: device.deviceId, ops: batch.map((r) => r.op) });
      const outcome = await applyPushResult(db, batch, response, now());
      round.acked += outcome.acked;
      round.rejected += outcome.rejected;
      // Ops the server left unanswered wait for the next trigger, not a hot loop.
      if (outcome.acked + outcome.rejected < batch.length) return round;
    }
  } catch (error) {
    return { ...round, status: 'failed', error };
  }
}
