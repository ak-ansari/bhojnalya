# 16 POS local store: Dexie, outbox, device invoice series, safety rails

Status: resolved
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

## Comments

- **CI does not run `test:contract`.** `apps/app` now has `test:int`
  (the invoice transaction on fake-indexeddb, run by CI's `pnpm test:int`)
  and `test:contract` (the outbox vs `fixtures/sync-push.json`). Root
  `package.json` already has `test:contract`, but the workflow only runs
  `test:int`. Someone with root/CI scope should add `pnpm test:contract`.
- **`docs/test-cases/index.md`**: no change needed (the `apps/app` catalogue
  row exists); the new cases are app 0201–0206.
- **Dexie ships in the shell chunk.** The app's single `PosDb` is created in
  `main.tsx` and passed through `AppProviders`, so a KDS downloads Dexie
  (~28 KB gz) though it never opens the database. The billing engine and all
  POS write code stay in POS-only chunks. Lazy-loading the database is a
  cheap follow-up if the KDS bundle matters.

## Answer

**Summary.** `apps/app` now has the till's local store, outbox, device
invoice series, sync runner and safety rails.

- `libs/local-db/db.ts`: Dexie 4.4.6 database `bhojnalya-pos` v1 with
  `outbox` (key `deviceSeq`, unique `opId`), `deviceCounters` (per FY),
  `orders`, `invoices` (unique `invoiceNo`), `payments`, `menu` (snapshot +
  version), `diningTables`, and `meta` (device identity, last `deviceSeq`,
  `lastInvoiceAt`, pull cursor). `LocalDbContext` provides it;
  `renderWithProviders` gives each test a fresh database.
- `libs/sync/outbox.ts`: `appendOp` (refuses to run outside a transaction,
  allocates the next `deviceSeq`, encodes through the contract's `SyncOp`
  codec), `pendingBatch` (≤ 200, `deviceSeq` order, refused ops skipped),
  `applyPushResult` (deletes acked, flags refused, ignores unknown ids),
  `retryRejected`, `countOutbox`.
- `modules/pos/local/`: `saveOrder`, `issueInvoice`, `recordPayment`, each
  one Dexie transaction: record + op. `issueInvoice(db, bill)` checks the
  clock guard against `lastInvoiceAt`, reads the order, runs
  `computeInvoice`, takes `seq = counter[fy] + 1`, formats the number from
  the device identity, writes counter, invoice, order status, op and
  `lastInvoiceAt` together.
- `libs/sync/syncRunner.ts`: `createSyncRunner({ db, push })` with
  `syncNow` (one round at a time; loops until empty; stops on a failed push
  or an unanswered op) and `start` (`online` event, 15 s interval while
  pending ops exist, one round at mount). `useSyncRunner` (mounted in
  `PosLayout`) also pushes on every staff-socket `connect`; `SocketProvider`
  now shares the socket through `StaffSocketContext`. `apiPost` sends the
  `Idempotency-Key` header and parses `SyncPushResponse`.
- Safety rails: `clearLocalData` checks and wipes in one transaction and
  throws `OutboxNotEmptyError(waiting)`; `assertOutboxEmpty` is there for
  sign-out. New POS route `/pos/device` (rail link "Device"): unsynced count,
  JSON/CSV export, retry refused, clear data, reset tablet (disabled with
  the count while anything waits).
- UI: top-bar badge ("3 not synced", "1 refused", "All synced"; links to
  the device screen), the offline strip adds "N changes are waiting to
  sync.", a danger banner while the clock is behind the last bill
  (`useClockBehind`, reusing the engine's guard), and a storage banner
  (`navigator.storage.persist()` on mount; Home Screen advice on an
  uninstalled iPad).

**Decisions.**

- **ADR 0025 (Proposed):** records and ops are stored in wire form (paise
  as digit strings) and validated by the contract on write; a refused op is
  held out of the push queue until staff retry; clearing data wipes the
  identity and counters too. On bigint: Dexie 4.4.6 and fake-indexeddb 6.2.5
  both store `bigint` *values* (not keys) — I checked — but WebKit is
  unverified on our iPads, and the wire form makes the outbox the push body.
- `dexie-react-hooks` dropped for a 30-line `useLiveQuery` on Dexie's
  `liveQuery`. Tests install fake-indexeddb globally in a setup file
  (`src/testing/indexedDb.ts`), each database with its own name: `liveQuery`
  never emits for a database given its own `IDBFactory` through constructor
  options.
- The Idempotency-Key on a push is a fresh UUIDv7 per request; the ops'
  own `opId` is what makes a replay safe.
- The app's test setup raises Testing Library's `findBy*` timeout to 5 s:
  under the full `--force` run a lazy route chunk plus the first IndexedDB
  open passed 1 s once.
- Orders are billed once (`OrderAlreadyBilledError`); a billed order cannot
  be re-saved.
- Logout is **not built** (no staff sign-in yet); it must call
  `assertOutboxEmpty`.

**Tests.** 61 unit/component tests in the app (was 16), 4 integration
(`test:int`), 1 contract (`test:contract`). The contract test drives
`saveOrder`, a KOT op, `issueInvoice` and `recordPayment` through the real
runner and MSW, and the pushed body equals `fixtures/sync-push.json`
exactly, including the engine's totals. 17 deliberate mutations (counter
write outside the transaction, no clock guard, seq not stored, batch of
201, wrong order, refused ops deleted, rails off, reset enabled on refused
ops, badge counting pending only, no strip count, clock hook off, no
persist request, no retry, no CSV quoting, wrong invoice seq, no
idempotency header, no socket trigger) each turned a test red; all
restored. Cases: app 0201–0206; app 0101's coverage now points to 0205.

**Notes for ticket 17 (sync API).**

- The POS sends ops exactly as the fixture; `deviceSeq` is per device and
  never reused, but **there can be holes on the server**: a refused op is
  held on the device while later ops keep coming (ADR 0025).
- The POS stops a round on any op left out of both `acked` and `rejected`
  and resends it on the next trigger; answer every op in a batch.
- A rejected op's `reason` is shown to staff as-is; use stable
  `ErrorCode`s.
- When `invoice.create` gains `serviceCharge.taxRateBp` / `outletTaxRateBp`,
  `issueInvoice` already has `outletTaxRateBp` in `BillInput`; add it to the
  payload there and the contract test will tell you.

**Notes for ticket 18 (POS screens).**

- Write only through `saveOrder` / `issueInvoice` / `recordPayment` (or a
  new function that does record + `appendOp` in one `db.transaction`).
  Read with `useLiveQuery` and decode with the contract schemas
  (`OrderUpsertPayload.parse(record.order)`).
- `BillInput` needs the outlet's tax mode, price mode, place of supply and
  default rate: they come from the menu/outlet snapshot (not built; the
  `menu` table holds `data: unknown`).
- Disable "Print bill" with `useClockBehind().behind`.
- KOT creation needs a per-device, per-business-day counter in the same
  transaction; add a Dexie `version(2)` (never edit version 1).
- Device pairing must write `meta.device` (`deviceId`, `outletPrefix`,
  `deviceCode`); until then the runner reports `unpaired` and
  `issueInvoice` throws `DeviceNotPairedError`.
- Today's invoices are never pruned yet.

**Proposed `docs/log.md` line.**

`- **Creation**: the till's local store (ticket 16): Dexie database, outbox with a strictly increasing device sequence, invoice issue (clock guard, device series counter, invoice and op in one transaction), sync runner (online, socket connect, 15 s; batches ≤ 200; acked removed, refused held), unsynced badge and offline-strip count, clear/reset blocked while anything is unsynced, JSON/CSV export, persistent-storage request and iPad install warning. Cases app 0201–0206; ADR 0025: the till stores what it will send, and a refused change waits for a person.`
