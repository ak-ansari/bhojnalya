# 02 Core contracts: money, ids, errors, sync ops, socket events

Status: resolved
Type: task
Blocked by: 01
Workspaces: packages/contracts

## What

The Zod schemas every other workspace imports (TRD §2 D10, §8.3, §9, §14).

## Acceptance

- `Paise` (bigint, integer, branded), `Uuidv7` schema + `newId()` helper, `IdempotencyKey`.
- Error envelope `{ code, message, details?, requestId }`.
- Sync protocol: `SyncPushRequest` (`deviceId`, `ops[]` max 200 with `opId`, `type`, `entityId`, `payload`, `createdAt`, `deviceSeq`), `SyncPushResponse` (`acked`, `rejected[{opId, reason}]`), `SyncPullResponse` (`changes`, `cursor`). Op `type` is a discriminated union. Start with `invoice.create`, `payment.create`, `invoice.cancel`, `order.upsert`, `kot.create`.
- Socket event name constants and payload types for every event in TRD §9 (`order.qr_pending`, `order.accepted`, `order.rejected`, `kot.created`, `kot.updated`, `kot.ready`, `item.stock_changed`, `aggregator.order_new`, `table.status_changed`). Payloads are notifications (ids only), per invariant 9.
- Enums: order channel, order type, KOT status, tax mode, price mode, device role.
- `fixtures/` folder with one sync push fixture; unit tests assert schemas against literals.

## Notes

Bigint doesn't survive JSON. Pick one wire encoding for paise (string of digits is the usual choice), apply it everywhere, and record it in an ADR.

## Comments

- **Wire casing.** The `api-code` skill says "snake_case ... on the wire", but
  TRD §8.3/§14 and this ticket spell the fields camelCase (`deviceId`, `opId`,
  `deviceSeq`, `requestId`). I followed the TRD and the ticket: JSON keys are
  camelCase, and enum *values* are snake_case (`dine_in`). Someone should
  reconcile the skill text (out of my scope).
- **Tax rates are integer basis points** (`taxRateBp: 500` = 5%) in the sync
  payloads, so no float ever holds a rate. Ticket 03's `computeInvoice` input
  should take the same unit, or ticket 17 has to convert. Please align at merge.
- **Sync payload shapes are a first cut.** `order.upsert` has no order status
  yet, and `SyncPullResponse.changes[].data` is `unknown`. Tickets 16, 17 and
  19 extend them in this package.
- `docs/test-cases/index.md` lists the catalogues and should gain the row
  `packages/contracts/docs/test-cases/ | the shared wire schemas | contracts 0001`.
- The fixture's totals (inclusive 5%: 2 × ₹40 chai + ₹120 sandwich = ₹200.00;
  taxable 19048, CGST 477, SGST 475) were worked by hand from TRD §6.1, per
  line on `unitPrice × quantity`. Ticket 17's contract test re-runs the engine
  on it and will catch it if ticket 03 rounds differently.

## Answer

Done. `@bhojnalya/contracts` now exports (zod 4.6.5):

- **Money:** `Paise` (branded bigint), `PaiseWire` (a zod codec: canonical
  digit string ⇄ `Paise`), and `paise()` to build one from a literal.
- **Ids:** `Uuidv7` (lowercase only), `newId(source?)` (RFC 9562 v7; clock and
  randomness injectable), `IdempotencyKey` (any lowercase UUID) and
  `IDEMPOTENCY_KEY_HEADER`.
- **Errors:** `ErrorEnvelope` `{ code, message, details?, requestId }`, with
  `code` as any SCREAMING_SNAKE_CASE value plus a starter `ERROR_CODES` list.
- **Sync:** `SyncPushRequest` (1–200 ops, with no repeated `opId` or
  `deviceSeq`), `SyncOp` (a discriminated union over `order.upsert`,
  `kot.create`, `invoice.create`, `payment.create`, `invoice.cancel`,
  with snapshot payloads), `SyncPushResponse`, `SyncPullQuery` and
  `SyncPullResponse`.
- **Socket:** `SOCKET_EVENTS` (the 9 TRD §9 names), `socketEventPayloads`
  (strict, ids only) and listener types.
- **Enums:** `OrderChannel`, `OrderType`, `KotStatus`, `TaxMode`, `PriceMode`,
  `DeviceRole`, plus `PaymentMethod`.
- **Fixture:** `fixtures/sync-push.json`, exported as
  `@bhojnalya/contracts/fixtures/sync-push.json`.

Decisions:

- **ADR 0018:** paise travel in JSON as canonical digit strings. One codec
  decodes and encodes them, so `SyncPushRequest.parse(json)` gives bigints
  and `z.encode(SyncPushRequest, value)` gives JSON-safe strings.
- **Requests are strict, responses are lenient.** An unknown field in a sync
  op is refused, not stripped, so it stays in the outbox. An older client can
  still read a newer server.
- All instants are UTC ISO strings with a `Z`.
- `tsconfig.json` now has `rootDir: "."` so tests can import the fixture JSON.
  `tsconfig.build.json` keeps `rootDir: "src"`.

Tests: 70 unit tests, including fast-check properties for the paise
round-trip and `newId`. All 24 deliberate mutations turned a test red.
Catalogue: `packages/contracts/docs/test-cases/` 0001–0006.

Proposed docs/log.md entry:

`- 2026-10-14 — 02 contracts: money (paise as digit strings, ADR 0018), UUIDv7 ids, error envelope, sync push/pull ops, socket events, shared enums and the sync-push fixture; catalogue packages/contracts/docs/test-cases 0001–0006.`
