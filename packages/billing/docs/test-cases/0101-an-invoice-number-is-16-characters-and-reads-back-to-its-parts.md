---
type: Test Case
title: "101. An invoice number is 16 characters and reads back to its parts"
description: Protects the GST length limit and the server's ability to find gaps in a device's series.
tags: [test-cases, invoice-numbering, gst]
status: Accepted
origin_repo: bhojnalya
timestamp: 2026-10-14T00:00:00Z
---

# 101. An invoice number is 16 characters and reads back to its parts

Date: 2026-10-14

## Status

Accepted

## Given

- An outlet prefix of two characters, each a capital letter or a digit.
- A device code of two characters, each a capital letter or a digit (base36).
- A financial year written as four digits, the second pair one year after
  the first (`2627`; `9900` follows `9899`).
- A sequence from 1 to 999,999 within that device and year.

## When

1. The engine writes an invoice number from those parts.
2. The engine reads an invoice number back into its parts.

## Then

- **Every number it writes is exactly 16 characters**, the GST limit, of the
  form prefix, device code, `/`, year, `/`, six-digit sequence: `BL0A/2627/000042`.
  A longer number could not be filed.
- It uses only capital letters, digits and `/`, which GST allows.
- **Reading a number gives back exactly the parts it was written from**, and
  writing those parts gives back the same number. The server relies on this
  to find a gap in a device's series.
- A part that is out of range is refused with an error naming which part:
  the prefix, the device code, the year or the sequence. Nothing that breaks
  the length or the character set is ever written.
- Text that is not of that form, or that is of that form with a year whose
  halves are not consecutive or a sequence of zero, is refused rather than
  read.

## Variations

| Input | Outcome |
| :-- | :-- |
| `BL`, `0A`, `2627`, 42 | `BL0A/2627/000042` |
| sequence 1 | `BL0A/2627/000001` |
| sequence 999,999 | `BL0A/2627/999999` |
| sequence 0, 1,000,000, 1.5 | refused: sequence |
| prefix `B`, `BLR`, `bl`, `B/`, `B-` | refused: prefix |
| device code `A`, `0AB`, `0a` | refused: device code |
| year `2626`, `26-27` | refused: year |
| read `BL0A/2627/42`, `bl0a/2627/000042` | refused: form |
| read `BL0A/2627/000000` | refused: sequence |

## Procedure

### Setup

`pnpm install` at the repo root on Node 22.

### Run

`pnpm --filter @bhojnalya/billing test`

### Verify

The `formatInvoiceNo` and `parseInvoiceNo` suites pass and coverage reports
100% for `src/numbering/invoice-number.ts`.

## Coverage

- `formatInvoiceNo › writes PPDD/FYFY/NNNNNN in 16 characters` (unit)
- `formatInvoiceNo › writes %o as %s` (unit, boundary table)
- `formatInvoiceNo › rejects %o as a bad %s` (unit, table)
- `formatInvoiceNo › never writes more than 16 characters` (unit, property)
- `formatInvoiceNo › writes only the characters GST allows: letters, digits and /` (unit, property)
- `formatInvoiceNo › throws an error that says what is wrong` (unit)
- `parseInvoiceNo › reads an invoice number back into its parts` (unit)
- `parseInvoiceNo › is the exact inverse of formatInvoiceNo` (unit, property)
- `parseInvoiceNo › rejects %j as a bad %s` (unit, table)
- `parseInvoiceNo › rejects any string that formatInvoiceNo could not have written` (unit, property)
- The server's gap detection over parsed numbers: **not built**.

Command: `pnpm --filter @bhojnalya/billing test`

## References

- [ADR 0007 An invoice number comes from a device series](../../../../docs/decisions/0007-an-invoice-number-comes-from-a-device-series.md)
- [billing 0102](./0102-an-invoice-belongs-to-the-financial-year-of-its-indian-time.md)
