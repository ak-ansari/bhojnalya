---
type: Test Case
title: "203. A till whose clock is behind its last bill does not bill"
description: Protects the invoice series from bills dated out of order or in the wrong financial year.
tags: [test-cases, invoice-numbering, clock]
status: Proposed
origin_repo: bhojnalya
timestamp: 2026-10-14T00:00:00Z
---

# 203. A till whose clock is behind its last bill does not bill

Date: 2026-10-14

## Status

Proposed

## Given

- A billing counter that has issued an invoice at 06:31:00 UTC.

## When

1. The device clock is set back, and the cashier tries to issue another
   invoice.
2. The till's screens are open while the clock is behind.

## Then

- **The invoice is refused with a clock-behind error, and nothing is
  written**: no invoice, no counter change, no queued change.
- An invoice at exactly the same instant as the last one is allowed.
- The till shows "This tablet's clock is behind its last bill." and says
  billing is paused until the date and time are corrected. The message goes
  away on its own once the clock is right (it is re-checked every few
  seconds).
- A clock at or after the last bill shows no message.

## Variations

| Clock vs last bill | Outcome |
| :-- | :-- |
| 1 ms earlier | refused, banner shown |
| same instant | billed |
| later | billed, no banner |

## Procedure

### Setup

`pnpm --filter @bhojnalya/app dev`, register as the billing counter.

### Run

Not reachable by hand yet: there is no bill screen to issue the first
invoice. Run the tests.

### Verify

`pnpm --filter @bhojnalya/app test` passes.

## Coverage

- `issueInvoice › refuses to bill when the clock is behind the last invoice, and writes nothing` (unit, emulated browser DB)
- `issueInvoice › bills at the same instant as the last invoice` (unit)
- `PosLayout › says billing is paused while the clock is behind the last bill` (component)
- `PosLayout › says nothing about the clock when it is at or past the last bill` (component)
- "Print bill" disabled while the clock is behind: **not built** (no bill screen yet).

Command: `pnpm --filter @bhojnalya/app test`

## References

- [app 0201](./0201-an-invoice-its-number-and-its-sync-change-are-saved-together-or-not-at-all.md)
- [ADR 0007 An invoice number comes from a device series](../../../../docs/decisions/0007-an-invoice-number-comes-from-a-device-series.md)
