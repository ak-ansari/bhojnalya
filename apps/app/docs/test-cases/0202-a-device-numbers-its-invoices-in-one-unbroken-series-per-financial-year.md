---
type: Test Case
title: "202. A device numbers its invoices in one unbroken series per financial year"
description: Protects the GST invoice series: sequential, unique per device and year, restarting on 1 April in Indian time.
tags: [test-cases, invoice-numbering, gst]
status: Proposed
origin_repo: bhojnalya
timestamp: 2026-10-14T00:00:00Z
---

# 202. A device numbers its invoices in one unbroken series per financial year

Date: 2026-10-14

## Status

Proposed

## Given

- A billing counter paired with prefix `BL` and device code `0A`.

## When

1. The cashier issues invoices one after another.
2. One is issued the second before midnight IST on 31 March, the next at
   midnight.

## Then

- **Numbers run `BL0A/2627/000001`, `BL0A/2627/000002`, … with no gap and no
  repeat**, online or offline, through the same path.
- The financial year comes from the invoice's own time in IST: 18:29:59 UTC
  on 31 March is still `2627`; 18:30:00 UTC is `2728` and starts again at
  `000001`.
- The device keeps one counter per financial year.
- Totals on the invoice come from the billing engine (two chai and a
  sandwich, inclusive 5%: ₹200.00, taxable ₹190.48, CGST ₹4.77, SGST ₹4.75).

## Variations

| Issued at (UTC) | Number |
| :-- | :-- |
| 2026-10-14 06:31:00, first | BL0A/2627/000001 |
| same day, second | BL0A/2627/000002 |
| 2027-03-31 18:29:59 | BL0A/2627/000001 |
| 2027-03-31 18:30:00 | BL0A/2728/000001 |

## Procedure

### Setup

`pnpm install` on Node 22.

### Run

`pnpm --filter @bhojnalya/app test`

### Verify

The `issueInvoice` tests pass.

## Coverage

- `issueInvoice › numbers invoices from the device series, one after another` (unit, emulated browser DB)
- `issueInvoice › starts a new series at 000001 on 1 April in IST` (unit)
- `issueInvoice › appends invoice.create with the engine totals and the next deviceSeq` (unit)
- Number format and the IST year boundary themselves: billing 0101–0104.
- Gap detection on the server: **not built** (sync API).

Command: `pnpm --filter @bhojnalya/app test`

## References

- [app 0201](./0201-an-invoice-its-number-and-its-sync-change-are-saved-together-or-not-at-all.md)
- [ADR 0007 An invoice number comes from a device series](../../../../docs/decisions/0007-an-invoice-number-comes-from-a-device-series.md)
- [ADR 0016 Indian time is a fixed offset, never the device's zone](../../../../docs/decisions/0016-indian-time-is-a-fixed-offset-never-the-devices-zone.md)
