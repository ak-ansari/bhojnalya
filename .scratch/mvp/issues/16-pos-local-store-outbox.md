# 16 POS local store: Dexie, outbox, device invoice series, safety rails

Status: ready-for-agent
Type: task
Blocked by: 03, 04, 10
Workspaces: apps/app

## What

Invariants 6 and 7 on the device side (TRD §8.2, §7). Load `web-code`.

## Acceptance

- Dexie schema: menu snapshot (+version), tables, open orders, today's invoices/payments, `device_counter[fy]`, outbox, last invoice timestamp.
- `issueInvoice(order)`: runs the billing engine, checks the clock guard, and in **one Dexie transaction** increments the counter, writes the invoice and appends the outbox op with the next `deviceSeq`. An integration test (fake-indexeddb) proves a thrown write rolls back both counter and invoice.
- Every local mutation goes local DB → outbox; the same path online and offline.
- Sync runner: on `online`, on socket connect, every 15 s while the outbox is non-empty; batches ≤ 200 in `deviceSeq` order; removes acked ops, surfaces rejected ones.
- Unsynced badge; logout/reset/clear data blocked while the outbox is non-empty; emergency export to JSON/CSV.
- `navigator.storage.persist()` at setup, warning when not granted / iPad not installed.
- The sync runner talks to the API through an HTTP client whose shapes come from `packages/contracts` (the server side is ticket 17; use MSW here).
