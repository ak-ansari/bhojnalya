---
type: Test Case
title: "103. A sale before the day-end cutoff counts towards the previous day"
description: Protects the business date that day-end reports group sales by, for cafés that close after midnight.
tags: [test-cases, reports, time]
status: Accepted
origin_repo: bhojnalya
timestamp: 2026-10-14T00:00:00Z
---

# 103. A sale before the day-end cutoff counts towards the previous day

Date: 2026-10-14

## Status

Accepted

## Given

- An outlet with a day-end cutoff, a whole hour from midnight to 23:00.
- An instant at which a sale is made.

## When

1. The engine works out the business date for that instant.

## Then

- **A sale before the cutoff, in Indian time, counts towards the previous
  calendar date.** With a 4 AM cutoff, 02:00 IST on the 15th is the 14th's
  business. A café's late-night sales stay with the evening they belong to.
- At or after the cutoff, the business date is that day's date.
- With a midnight cutoff, the business date is the Indian calendar date,
  whatever the device's time zone.
- It is always the Indian date of the instant moved back by the cutoff, so
  month ends, year ends and 29 February fall out correctly.
- A cutoff that is not a whole hour from 0 to 23, or an invalid time, is
  refused.

## Variations

| Sale time (IST) | Cutoff | Business date |
| :-- | :-- | :-- |
| 15 Oct 2026 02:00 | 4 AM | 14 Oct 2026 |
| 15 Oct 2026 03:59:59.999 | 4 AM | 14 Oct 2026 |
| 15 Oct 2026 04:00 | 4 AM | 15 Oct 2026 |
| 15 Oct 2026 00:00 | midnight | 15 Oct 2026 |
| 1 Mar 2028 01:00 | 4 AM | 29 Feb 2028 |
| 1 Jan 2027 03:00 | 4 AM | 31 Dec 2026 |
| 15 Oct 2026 22:30 | 23:00 | 14 Oct 2026 |
| any | -1, 24, 4.5 | refused |

## Procedure

### Setup

`pnpm install` at the repo root on Node 22.

### Run

`pnpm --filter @bhojnalya/billing test`

### Verify

The `businessDate` suite passes.

## Coverage

- `businessDate › puts 02:00 IST into the previous day with a 4 AM cutoff` (unit)
- `businessDate › %s with cutoff %i is business date %s` (unit, table)
- `businessDate › is the IST calendar date when the cutoff is midnight` (unit, property)
- `businessDate › is the IST date of the instant moved back by the cutoff` (unit, property)
- `businessDate › refuses cutoff hour %s` (unit, table)
- `businessDate › refuses an invalid Date` (unit)
- Storing the business date on sales and grouping the day-end report by it: **not built**.

Command: `pnpm --filter @bhojnalya/billing test`

## References

- [ADR 0016 Indian time is a fixed offset, never the device's zone](../../../../docs/decisions/0016-indian-time-is-a-fixed-offset-never-the-devices-zone.md)
