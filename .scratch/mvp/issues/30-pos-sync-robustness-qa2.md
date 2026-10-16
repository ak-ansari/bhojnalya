# 30 POS sync and local-write robustness (QA round 2)

Status: ready-for-agent
Type: bug
Blocked by: 28
Workspaces: apps/app

QA round 2 on ticket 16, development @ 5febd39. Probes: `/private/tmp/claude-501/-Users-akansari-projects-bhojnalya/947da6ab-097f-41ff-891f-25d045e1c00f/scratchpad/pos16/qa16.int.test.ts` (output in `out.txt`) and `/private/tmp/claude-501/-Users-akansari-projects-bhojnalya/947da6ab-097f-41ff-891f-25d045e1c00f/scratchpad/ui/pos16b.mjs`. Each fix starts with a red test.

1. **One bad batch blocks the outbox forever, silently** (`syncRunner.ts` runRound, `useSyncRunner.ts`). 250 ops; push throws ApiError 400/413/402/403 every time → the same first 200 resend every 15 s, 201+ never go; `SyncRound.status/error` are dropped by `void syncNow()`. Expected: tell a whole-batch 4xx from a network error; on 413 split the batch; on other 4xx stop retrying that batch and surface it (badge + `/pos/device`), so staff see it. ADR 0025: one bad record never holds up the rest.
2. **Invalid `meta.lastInvoiceAt` bricks the till.** `useClockBehind.ts:32-38` rethrows non-ClockBehindError, so a RangeError during render takes down `/pos` and `/pos/device`. Treat an unreadable `lastInvoiceAt` as recoverable in the banner and in `issueInvoice.ts` (block billing with a clear message; recovery and export must still work).
3. **A malformed field in the push response discards all acks** (`SyncPushResponse.parse` at `syncRunner.ts:77`). `rejected:[{opId, reason:'Order not found'}]` fails to parse → acks lost, batch resent forever. Parse each rejection on its own; an unknown reason becomes a generic code; never drop valid acks.
4. **Overpayment and duplicate payments are accepted** (`payments.ts`). A ₹200 invoice took two cash payments of 99,999,999 paise. Rule (default; confirm with user): non-cash payments are capped at the amount still due; cash may exceed it, and the excess is recorded as change given (tendered vs applied), never as revenue. A payment on a fully paid invoice is refused.
5. **"Clear data" leaves a half-paired till** (`ResetPanel.tsx:33-39`). It wipes device meta, counters and deviceSeq but doesn't unregister: the till looks set up and `issueInvoice` throws `DeviceNotPairedError`. Make Clear unregister and route to `/register`.
6. **`applyPushResult` miscounts** (`outbox.ts:72-83`): `acked:[a,a]` for batch [a,b] counts 2; an opId both acked and rejected counts twice; this defeats the unanswered-stop check and loops. Count distinct opIds that are in the batch.
7. `outboxToCsv`: neutralise cells starting with `= + - @` (prefix `'`).
8. **Gate flake:** `syncRunner.test.ts` "pushes in batches of at most 200" (450 ops via MSW) times out at 5 s under load. Give it an explicit timeout or shrink the fixture while still crossing the 200 and 400 boundaries.
9. `countOutbox` loads the whole outbox each tick: use `.count()` and an indexed refused count.
10. Single-flight across tabs: use the Web Locks API so two tabs never push the same ops at once (fall back to the per-runner guard).
11. `issueInvoice` reads `now` before the transaction: read it inside, so a later bill from another tab can't wrongly trip the clock guard.
12. Reuse one Idempotency-Key per batch across retries (store it with the batch) instead of a new key per attempt (invariant 8).
