---
type: Test Case
title: "204. Every till change reaches the server in order, and leaves the device only when acknowledged"
description: Protects offline bills from being lost or applied out of order on the way to the server.
tags: [test-cases, offline, sync]
status: Proposed
origin_repo: bhojnalya
timestamp: 2026-10-14T00:00:00Z
---

# 204. Every till change reaches the server in order, and leaves the device only when acknowledged

Date: 2026-10-14

## Status

Proposed

## Given

- A paired billing counter with changes waiting to sync (orders, a KOT, an
  invoice, a payment).

## When

1. The network comes back, the staff socket connects, or 15 seconds pass
   with changes waiting.
2. The server acknowledges some changes, refuses some, leaves some
   unanswered, or fails.

## Then

- **Every change carries a device sequence one higher than the last, and the
  number is never reused**, even after earlier changes have synced.
- Changes go out oldest first, in batches of at most 200 (450 waiting → 200,
  200, 50), until none are waiting.
- **Only acknowledged changes leave the device.** A refused change stays,
  with the server's reason, and is not sent again until staff retry it;
  later changes keep syncing. An unanswered change stays and waits for the
  next trigger. A failed push changes nothing.
- Each push carries the device's id and an idempotency key, and its body is
  one the shared contract accepts.
- **What the till pushes for an order, its KOT, its invoice and its payment
  equals the shared sync-push fixture**, field for field.
- Two triggers at once send one push, not two.
- An unpaired or offline device pushes nothing.

## Variations

| Server answer | Change on the device |
| :-- | :-- |
| acked | removed |
| refused | kept, flagged with the reason, out of the queue |
| no answer | kept, sent on the next trigger |
| 5xx / network error | kept |

## Procedure

### Setup

`pnpm install` on Node 22.

### Run

`pnpm --filter @bhojnalya/app test` and `pnpm --filter @bhojnalya/app test:contract`

### Verify

All pass. The server side of sync is not built, so this cannot be run
against a real API yet.

## Coverage

- `POS local writes › gives every local change an op with a strictly increasing deviceSeq` (unit, emulated browser DB)
- `outbox › never reuses a deviceSeq after its op has been acked` (unit)
- `outbox › refuses to append an op outside a transaction` (unit)
- `outbox › batches at most 200 ops, oldest first, skipping refused ones` (unit)
- `outbox › removes acked ops, flags refused ones and keeps unanswered ones` (unit)
- `outbox › puts refused ops back in line when staff retry them` (unit)
- `syncRunner › pushes in batches of at most 200, in deviceSeq order, until the outbox is empty` (component, MSW)
- `syncRunner › sends a body the contract accepts, with the device id and an idempotency key` (component, MSW)
- `syncRunner › removes only acked ops, keeps refused ones flagged and stops on unanswered ones` (component, MSW)
- `syncRunner › keeps every op when the push fails` (component, MSW)
- `syncRunner › does not push from a device that is not paired or not online` (component)
- `syncRunner › joins a round already running instead of pushing the same ops twice` (component, MSW)
- `syncRunner › pushes when the network comes back` (component, MSW)
- `syncRunner › retries on its interval while ops are waiting` (component, MSW)
- `useSyncRunner › pushes the outbox each time the staff socket connects` (component, MSW)
- `sync push contract (POS side) › pushes the order, KOT, invoice and payment of the fixture exactly as written there` (contract)
- The server applying the fixture: **GAP** until the sync API exists; the POS side alone does not cover the seam.
- Background Sync API: **not built**.
- Pull (`/sync/pull`): **not built**.

Command: `pnpm --filter @bhojnalya/app test` and `pnpm --filter @bhojnalya/app test:contract`

## References

- [app 0205](./0205-a-till-with-unsynced-changes-cannot-be-cleared-and-always-says-how-many.md)
- [ADR 0006 The till is local-first; the kitchen and guests are online](../../../../docs/decisions/0006-the-till-is-local-first-the-kitchen-and-guests-are-online.md)
- [ADR 0025 The till stores what it will send, and a refused change waits for a person](../../../../docs/decisions/0025-the-till-stores-what-it-will-send-and-a-refused-change-waits-for-a-person.md)
