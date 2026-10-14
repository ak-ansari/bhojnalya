---
type: Test Case
title: "201. An invoice, its number and its sync change are saved together or not at all"
description: Protects the device's invoice series from a number used without its invoice, and an invoice that never reaches the server.
tags: [test-cases, offline, invoice-numbering, sync]
status: Proposed
origin_repo: bhojnalya
timestamp: 2026-10-14T00:00:00Z
---

# 201. An invoice, its number and its sync change are saved together or not at all

Date: 2026-10-14

## Status

Proposed

## Given

- A billing counter paired with an outlet prefix and a device code, holding
  an open order.

## When

1. The cashier issues the invoice for the order, and any one of the writes
   fails: the counter, the invoice, the order's status or the change queued
   for sync.
2. The cashier issues it again and nothing fails.

## Then

- **After a failure, nothing has changed on the device**: the counter for
  the financial year, the invoices, the order's status, the queue of changes
  waiting to sync, the change sequence and the time of the last invoice are
  all exactly as before. A number is never used without its invoice.
- The retry gets the number the failed attempt would have used
  (`BL0A/2627/000001` for the device's first invoice of the year).
- On success all of them change together: the counter reads 1, there is one
  invoice, the order is billed, and one invoice change is queued after the
  order's own change.
- The invoice and its change are checked against the shared sync contract as
  they are written; one that breaks it is not saved and its number is not
  used.
- An order is billed once; a second attempt is refused and writes nothing.
- A device with no identity yet, or an order not on the device, is refused
  before anything is written.

## Variations

| Failure | Outcome |
| :-- | :-- |
| change queue write throws | nothing written |
| invoice write fails (number already held) | nothing written |
| none | counter, invoice, order and change written |
| order already billed | refused, still one invoice |

## Procedure

### Setup

`pnpm install` on Node 22.

### Run

`pnpm --filter @bhojnalya/app test:int`

### Verify

All four transaction tests pass. To see the guarantee hold, move the counter
write out of the transaction in the invoice code and run again: the rollback
tests fail.

## Coverage

- `issueInvoice transaction › rolls back the counter, the invoice and the order when the outbox write throws` (integration, emulated browser DB)
- `issueInvoice transaction › rolls back the counter and the op when the invoice write fails` (integration)
- `issueInvoice transaction › commits the counter, the invoice, the order and the op together when nothing throws` (integration)
- `issueInvoice transaction › gives the next attempt the number a failed attempt would have used` (integration)
- `issueInvoice › appends invoice.create with the engine totals and the next deviceSeq` (unit)
- `issueInvoice › refuses to bill an order twice` (unit)
- `issueInvoice › refuses a device that is not paired` (unit)
- `issueInvoice › refuses an order that is not on the device` (unit)
- `POS local writes › writes neither the order nor its op when the op breaks the contract` (unit)
- Durability on a real tablet after a crash mid-bill (e2e, QA): **GAP**, no Playwright suite or device run yet.
- The bill screen that issues an invoice: **not built**.

Command: `pnpm --filter @bhojnalya/app test:int` and `pnpm --filter @bhojnalya/app test`

## References

- [app 0202](./0202-a-device-numbers-its-invoices-in-one-unbroken-series-per-financial-year.md)
- [ADR 0007 An invoice number comes from a device series](../../../../docs/decisions/0007-an-invoice-number-comes-from-a-device-series.md)
- [ADR 0025 The till stores what it will send, and a refused change waits for a person](../../../../docs/decisions/0025-the-till-stores-what-it-will-send-and-a-refused-change-waits-for-a-person.md)
