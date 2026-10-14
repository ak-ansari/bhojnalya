---
type: Test Case
title: "102. An invoice belongs to the financial year of its Indian time"
description: Protects the year in every invoice number, and the 1 April reset, from the device's time zone.
tags: [test-cases, invoice-numbering, gst, time]
status: Accepted
origin_repo: bhojnalya
timestamp: 2026-10-14T00:00:00Z
---

# 102. An invoice belongs to the financial year of its Indian time

Date: 2026-10-14

## Status

Accepted

## Given

- An instant at which an invoice is issued.
- The device may be set to any time zone.

## When

1. The engine works out the financial year for that instant.

## Then

- **The year turns at 1 April 00:00 Indian Standard Time**, which is
  31 March 18:30 UTC. A bill at 23:59:59.999 IST on 31 March is in the old
  year; one at 00:00 IST on 1 April is in the new one.
- The year is written as four digits, start year then end year, each as its
  last two digits: FY 2026-27 is `2627`, FY 2099-2100 is `9900`.
- The answer does not depend on the device's time zone: it agrees with
  Indian time as the platform's time-zone database gives it, at every instant
  from 2000 to 2099.
- An invalid time is refused rather than given a year.

## Variations

| Instant | Year |
| :-- | :-- |
| 31 Mar 2027 18:29:59.999 UTC | `2627` |
| 31 Mar 2027 18:30:00.000 UTC | `2728` |
| 1 Apr 2026 00:00 IST | `2627` |
| 31 Mar 2026 23:59:59 IST | `2526` |
| 31 Dec 2026 20:00 UTC (1 Jan 01:30 IST) | `2627` |
| 1 Apr 2099 00:00 IST | `9900` |

## Procedure

### Setup

`pnpm install` at the repo root on Node 22. Tests run with the machine clock
in UTC.

### Run

`pnpm --filter @bhojnalya/billing test`

### Verify

The `financialYear` and `isFinancialYear` suites pass.

## Coverage

- `financialYear › turns at 1 April 00:00 IST, which is 31 March 18:30 UTC` (unit)
- `financialYear › puts %s in FY %s` (unit, table)
- `financialYear › agrees with the time-zone database for Asia/Kolkata at every instant` (unit, property)
- `financialYear › always writes a well-formed financial year` (unit, property)
- `financialYear › refuses an invalid Date` (unit)
- `isFinancialYear › %s → %s` (unit, table)
- Blocking a bill on the till across the year boundary: **not built**.

Command: `pnpm --filter @bhojnalya/billing test`

## References

- [ADR 0007 An invoice number comes from a device series](../../../../docs/decisions/0007-an-invoice-number-comes-from-a-device-series.md)
- [ADR 0016 Indian time is a fixed offset, never the device's zone](../../../../docs/decisions/0016-indian-time-is-a-fixed-offset-never-the-devices-zone.md)
- [billing 0101](./0101-an-invoice-number-is-16-characters-and-reads-back-to-its-parts.md)
