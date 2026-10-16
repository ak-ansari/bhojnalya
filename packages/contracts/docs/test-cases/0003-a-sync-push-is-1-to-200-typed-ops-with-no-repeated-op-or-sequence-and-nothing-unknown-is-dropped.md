---
type: Test Case
title: "3. A sync push is 1 to 200 typed ops with no repeated op or sequence, and nothing unknown is dropped"
description: Protects the offline till's outbox from batches the server cannot apply in a single order, and from fields silently lost on the way.
tags: [test-cases, sync, offline, contracts]
status: Proposed
origin_repo: bhojnalya
timestamp: 2026-10-14T00:00:00Z
---

# 3. A sync push is 1 to 200 typed ops with no repeated op or sequence, and nothing unknown is dropped

Date: 2026-10-14

## Status

Proposed

## Given

- A till that has made changes locally (an order, a kitchen ticket, an
  invoice, a payment, a cancellation) and holds them in order, each with its
  own op id and a per-device sequence number.
- The shared sync fixture: one batch with an order, its kitchen ticket, an
  inclusive-price invoice for ₹200.00 and its cash payment.

## When

1. The batch is read.
2. The server replies with what it applied and what it refused.
3. A device pulls changes since its cursor.

## Then

- **The fixture reads with every literal intact**: its op types and sequence
  numbers, the invoice number `BL0A/2627/000042`, and its amounts as exact
  paise (₹40.00 a chai, ₹190.48 taxable, ₹4.77 CGST, ₹4.75 SGST, ₹200.00
  total and paid). Writing it back gives the same document.
- **A batch holds at least 1 and at most 200 ops.**
- **A batch that repeats an op id or a sequence number is refused** and the
  error points at the repeat. Otherwise the order to apply it in would be
  ambiguous. Ops may arrive in any order; the sequence number orders them.
- Each op's type is one of order upsert, kitchen ticket create, invoice
  create, payment create and invoice cancel. Its payload must be the one for
  that type.
- **A field nobody knows is refused, not dropped**, so data from a newer
  till stays in its outbox instead of being half-applied.
- An amount sent as a JSON number is refused (contracts 0001).
- **An invoice carries the outlet tax rate it was billed at** (the
  fixture's is 5%), a whole number of basis points, so re-running it later
  charges a taxed service charge at that rate, not the outlet's current one.
  An invoice without it is refused.
- A cancellation needs a reason. A payment is more than zero paise. An
  invoice number longer than 16 characters is refused. Every time is UTC.
- The reply lists acked op ids and refused ops, each refusal with a
  machine-readable reason code. A pull reply has the changes and a cursor; a
  first pull has no cursor.

## Variations

| Batch | Outcome |
| :-- | :-- |
| the fixture | read; written back unchanged |
| the fixture reversed | read |
| 200 cancellations | read |
| 201 cancellations, or none | refused |
| sequence 1 twice | refused at the second op's sequence |
| an op id twice | refused at the second op's id |
| invoice with an extra `tip` field | refused |
| payment of `"0"` | refused |
| invoice without its outlet tax rate, or at 5.005% | refused |
| invoice number `BL0A/2627/0000042` (17 chars) | refused |
| `createdAt` with `+05:30` | refused |

## Procedure

### Setup

`pnpm install` at the repo root on Node 22.

### Run

`pnpm --filter @bhojnalya/contracts test`

### Verify

The `SyncPushRequest`, `SyncOp`, `SyncPushResponse` and `SyncPullResponse`
suites pass.

## Coverage

- `SyncPushRequest › reads the shared fixture, decoding paise to bigint and keeping every literal` (unit)
- `SyncPushRequest › encodes a parsed batch back to the fixture document` (unit)
- `SyncPushRequest › carries at most 200 ops and at least one` (unit)
- `SyncPushRequest › refuses a batch that repeats an opId or a deviceSeq` (unit)
- `SyncPushRequest › accepts ops in any order; the server applies them by deviceSeq` (unit)
- `SyncPushRequest › refuses a field it does not know rather than dropping it` (unit)
- `SyncPushRequest › refuses an amount sent as a JSON number` (unit)
- `SyncOp › knows exactly these op types` (unit)
- `SyncOp › picks the payload by type` (unit)
- `SyncOp › refuses a cancellation without a reason` (unit)
- `SyncOp › refuses a payment of zero paise` (unit)
- `SyncOp › refuses an invoice number longer than 16 characters` (unit)
- `SyncOp › refuses an invoice without the outlet tax rate it was billed at` (unit)
- `SyncOp › refuses a time that is not UTC` (unit)
- `SyncPushResponse › reads { acked, rejected[{ opId, reason }] }` (unit)
- `SyncPullResponse › reads { changes, cursor }` (unit)
- `SyncPullResponse › starts without a cursor and continues with the one it was given` (unit)
- The till writing a batch equal to the fixture, and the server applying it:
  **not built** (contract tests on each side, later).
- The fixture's totals agreeing with the billing engine: **not built**.

Command: `pnpm --filter @bhojnalya/contracts test`

## References

- [contracts 0001](./0001-money-crosses-the-wire-as-canonical-paise-digits-and-decodes-to-the-exact-amount.md)
- [ADR 0006 The till is local-first; the kitchen and guests are online](../../../../docs/decisions/0006-the-till-is-local-first-the-kitchen-and-guests-are-online.md)
- [ADR 0007 An invoice number comes from a device series](../../../../docs/decisions/0007-an-invoice-number-comes-from-a-device-series.md)
- [ADR 0008 Financial records are append-only](../../../../docs/decisions/0008-financial-records-are-append-only.md)
- [ADR 0017 A discount comes off the taxable value, and service charge is charged on what remains](../../../../docs/decisions/0017-a-discount-comes-off-the-taxable-value-and-service-charge-is-charged-on-what-remains.md)
