// The sync protocol (invariant 7, TRD §8.3):
//   POST /api/v1/sync/push  SyncPushRequest → SyncPushResponse
//   GET  /api/v1/sync/pull?cursor=  SyncPullQuery → SyncPullResponse
// Requests are strict (the server never drops a field it did not read);
// responses are lenient, so an older POS can read a newer server.
import { z } from 'zod';

import { ErrorCode } from './errors.js';
import { Uuidv7 } from './ids.js';
import { SyncOp } from './sync-ops.js';

/** The most ops one push may carry. */
export const MAX_SYNC_BATCH = 200;

export const SyncPushRequest = z.strictObject({
  deviceId: Uuidv7,
  ops: z.array(SyncOp).min(1).max(MAX_SYNC_BATCH).superRefine(requireUniqueIdsAndSeqs),
});
export type SyncPushRequest = z.output<typeof SyncPushRequest>;
export type SyncPushRequestWire = z.input<typeof SyncPushRequest>;

export const SyncPushResponse = z.object({
  /** Applied now or before: a replayed op is acked again, never re-applied. */
  acked: z.array(Uuidv7),
  /** Not applied; the op stays in the device's outbox and is shown to staff. */
  rejected: z.array(z.object({ opId: Uuidv7, reason: ErrorCode })),
});
export type SyncPushResponse = z.infer<typeof SyncPushResponse>;

export const SyncPullQuery = z.strictObject({
  /** Absent on a device's first pull. */
  cursor: z.string().min(1).optional(),
});
export type SyncPullQuery = z.infer<typeof SyncPullQuery>;

/** Server-owned state a device refreshes: the menu, tables, orders and stock (TRD §8.3). */
export const SyncChangeEntity = z.enum(['menu', 'table', 'order', 'stock']);

export const SyncChange = z.object({
  entity: SyncChangeEntity,
  entityId: Uuidv7,
  deleted: z.boolean(),
  /** The entity's current state; its shape is typed by the module that owns it. */
  data: z.unknown(),
});

export const SyncPullResponse = z.object({
  changes: z.array(SyncChange),
  /** Opaque: the device sends it back unchanged on its next pull. */
  cursor: z.string().min(1),
});
export type SyncPullResponse = z.infer<typeof SyncPullResponse>;

// A repeated opId or deviceSeq inside one batch leaves the apply order
// ambiguous, so the whole batch is refused before anything is applied.
function requireUniqueIdsAndSeqs(ops: readonly SyncOp[], ctx: z.RefinementCtx): void {
  const opIds = new Set<string>();
  const seqs = new Set<number>();
  ops.forEach((op, index) => {
    if (opIds.has(op.opId)) {
      ctx.addIssue({ code: 'custom', path: [index, 'opId'], message: `duplicate opId ${op.opId}` });
    }
    if (seqs.has(op.deviceSeq)) {
      ctx.addIssue({
        code: 'custom',
        path: [index, 'deviceSeq'],
        message: `duplicate deviceSeq ${String(op.deviceSeq)}`,
      });
    }
    opIds.add(op.opId);
    seqs.add(op.deviceSeq);
  });
}
