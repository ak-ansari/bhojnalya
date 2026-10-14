---
type: Test Case
title: "104. A device whose clock is behind its last invoice cannot bill"
description: Protects invoice order and the financial year from a device clock that has moved backwards.
tags: [test-cases, invoice-numbering, time]
status: Accepted
origin_repo: bhojnalya
timestamp: 2026-10-14T00:00:00Z
---

# 104. A device whose clock is behind its last invoice cannot bill

Date: 2026-10-14

## Status

Accepted

## Given

- A device that has issued an invoice at a known time, or has issued none.

## When

1. The engine checks the device's clock before a new invoice.

## Then

- **If the clock reads earlier than the last invoice, the check fails** with
  a clock-behind error that carries both times, so the till can tell staff
  how far behind it is. A clock running backwards would put bills out of
  order and, near 1 April, in the wrong year.
- A clock reading the same instant as the last invoice, or later, passes.
- A device with no invoice yet passes at any time.
- The check fails exactly when the clock is earlier than the last invoice,
  for any pair of times.
- An invalid time is refused rather than passed.

## Variations

| Clock | Last invoice | Outcome |
| :-- | :-- | :-- |
| 09:59:59.999 | 10:00:00.000 | blocked |
| 10:00:00.000 | 10:00:00.000 | passes |
| 10:00:00.001 | 10:00:00.000 | passes |
| any | none | passes |

## Procedure

### Setup

`pnpm install` at the repo root on Node 22.

### Run

`pnpm --filter @bhojnalya/billing test`

### Verify

The `assertClockNotBehind` suite passes.

## Coverage

- `assertClockNotBehind › blocks billing when the clock reads earlier than the last invoice` (unit)
- `assertClockNotBehind › carries both instants on the error so the POS can tell staff how far behind` (unit)
- `assertClockNotBehind › allows the same instant as the last invoice` (unit)
- `assertClockNotBehind › allows a clock ahead of the last invoice` (unit)
- `assertClockNotBehind › allows any clock on a device with no invoice yet` (unit)
- `assertClockNotBehind › throws exactly when now is earlier than the last invoice` (unit, property)
- `assertClockNotBehind › refuses an invalid Date rather than letting it through` (unit)
- The till blocking billing and asking staff to fix the clock: **not built**.

Command: `pnpm --filter @bhojnalya/billing test`

## References

- [ADR 0007 An invoice number comes from a device series](../../../../docs/decisions/0007-an-invoice-number-comes-from-a-device-series.md)
