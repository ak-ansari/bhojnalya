# 02 Core contracts: money, ids, errors, sync ops, socket events

Status: ready-for-agent
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
