---
type: Test Case
title: "205. A till with unsynced changes cannot be cleared, and always says how many"
description: Protects unsynced bills from being wiped by a reset, and staff from not knowing they are there.
tags: [test-cases, offline, sync, safety]
status: Proposed
origin_repo: bhojnalya
timestamp: 2026-10-14T00:00:00Z
---

# 205. A till with unsynced changes cannot be cleared, and always says how many

Date: 2026-10-14

## Status

Proposed

## Given

- A billing counter with some changes not yet synced, some of them refused
  by the server.

## When

1. Staff look at any till screen, online or offline.
2. Staff open the device screen and try to clear the data or reset the
   tablet.
3. Staff export the unsynced changes, or retry the refused ones.
4. Everything has synced, and staff clear or reset the tablet.

## Then

- **The top bar always shows the count**: "3 not synced", with refused ones
  counted apart ("1 refused"), or "All synced". It updates as changes are
  made and synced. Offline, the strip adds "2 changes are waiting to sync."
- **Clearing and resetting are refused while anything is unsynced, refused
  changes included**: the buttons are disabled, the screen says how many
  changes are waiting and what to do, and the wipe itself re-checks so a
  change made meanwhile still blocks it. Nothing is deleted.
- Unsynced changes export as JSON (the exact changes, with the device id) and
  as CSV (one row per change: sequence, id, type, record, time, invoice
  number, amount in paise, status, reason).
- Retrying puts refused changes back in the queue.
- Once everything has synced, clearing wipes every table, the device
  identity and invoice counters included, so the tablet must be paired again
  before it can bill. Resetting also forgets the tablet's role and returns to
  set-up.
- Staff sign-out: **not built**; it must call the same check.

## Variations

| Waiting (refused) | Clear / reset |
| :-- | :-- |
| 3 (0) | blocked, "3 changes" |
| 1 (1) | blocked, "1 change" |
| 0 | allowed, everything wiped |

## Procedure

### Setup

`pnpm --filter @bhojnalya/app dev`, register as the billing counter.

### Run

Open Device in the rail. With nothing waiting, tap "Clear data on this
tablet", then "Reset this tablet".

### Verify

"Data on this tablet was cleared." appears, then the set-up screen. Waiting
changes cannot be produced by hand until the order screen exists; the tests
cover that path.

## Coverage

- `PosLayout › shows how many changes have not synced in the top bar` (component)
- `PosLayout › shows all synced when the outbox is empty, and updates as ops are added` (component)
- `PosLayout › counts refused changes apart, and still as not synced` (component)
- `PosLayout › says in the offline strip how many changes are waiting` (component)
- `PosDevicePage › blocks clearing and resetting while changes have not synced, and says how many` (component)
- `PosDevicePage › still blocks them when the only change waiting is one the server refused` (component)
- `PosDevicePage › clears every local table once everything has synced` (component)
- `PosDevicePage › resets the tablet back to set-up once everything has synced` (component)
- `PosDevicePage › exports the unsynced changes as JSON and CSV files` (component)
- `PosDevicePage › puts refused changes back in line when staff retry them` (component)
- `safetyRails › refuses to clear local data while ops are waiting, and says how many` (unit, emulated browser DB)
- `safetyRails › refuses while the only waiting op is one the server refused` (unit)
- `safetyRails › wipes every table, the device identity and counters included, once all is synced` (unit)
- `exportOutbox › exports every op as JSON exactly as it would be pushed` (unit)
- `exportOutbox › exports one CSV row per op, with refused ops and their reason` (unit)
- `exportOutbox › quotes a field holding a comma or a quote` (unit)
- Saving the export file on an iPad (QA): **GAP**, no device run yet.

Command: `pnpm --filter @bhojnalya/app test`

## References

- [app 0101](./0101-an-offline-device-says-so-and-says-what-still-works.md)
- [app 0204](./0204-every-till-change-reaches-the-server-in-order-and-leaves-the-device-only-when-acknowledged.md)
- [ADR 0006 The till is local-first; the kitchen and guests are online](../../../../docs/decisions/0006-the-till-is-local-first-the-kitchen-and-guests-are-online.md)
- [ADR 0025 The till stores what it will send, and a refused change waits for a person](../../../../docs/decisions/0025-the-till-stores-what-it-will-send-and-a-refused-change-waits-for-a-person.md)
