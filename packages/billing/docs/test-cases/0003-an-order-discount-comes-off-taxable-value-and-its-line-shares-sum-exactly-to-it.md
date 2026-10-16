---
type: Test Case
title: "3. An order discount comes off taxable value, and its line shares sum exactly to it"
description: Protects the discount on the bill, the tax charged after it, and the per-line figures the GST summary is built from.
tags: [test-cases, billing, discount]
status: Accepted
origin_repo: bhojnalya
timestamp: 2026-10-14T00:00:00Z
---

# 3. An order discount comes off taxable value, and its line shares sum exactly to it

Date: 2026-10-14

## Status

Accepted

## Given

- A bill with an order discount, either a flat amount or a percentage, and
  menu prices that either exclude or include GST.

## When

1. The engine computes the invoice.

## Then

- A percentage discount is that percentage of the subtotal of taxable values,
  rounded half up once.
- **The discount is split across lines in proportion to their taxable
  values: each share is rounded down, and the paise left over go one each to
  the lines with the largest remainders; a tie is settled by the lines
  themselves, never their order ([billing 0009](./0009-a-bill-adds-up-the-same-whatever-order-its-lines-are-in.md)).
  The shares always sum exactly to the discount**, and no line's share
  exceeds its taxable value.
- **Tax is charged on what is left after the discount.** A line that
  receives any share is taxed at its rate on its reduced taxable value, in
  either price mode. An inclusive-price line that receives no share keeps its
  menu price ([billing 0002](./0002-each-line-is-taxed-on-its-own-and-its-tax-splits-exactly-into-cgst-and-sgst.md)).
- On an inclusive-price bill the total therefore falls by the discount plus
  the tax on it.
- A 100% discount leaves nothing taxable and a bill of ₹0.00.

## Variations

| Lines (taxable) | Discount | Shares |
| :-- | :-- | :-- |
| ₹90.00, ₹149.00, ₹45.00 | ₹25.00 flat | ₹7.92, ₹13.12, ₹3.96 |
| ₹284.76, ₹188.57, ₹16.95 | 10% = ₹49.03 | ₹28.48, ₹18.86, ₹1.69 |
| ₹80.00, ₹45.00 | ₹10.00 flat | ₹6.40, ₹3.60 |
| ₹104.76, ₹104.76 (identical lines) | ₹0.01 flat | ₹0.01, ₹0.00 |
| ₹50.00 | 100% | ₹50.00 |

## Procedure

### Setup

`pnpm install` at the repo root on Node 22.

### Run

`pnpm --filter @bhojnalya/billing test`

### Verify

Golden files 02, 04, 05 and 08 and the properties below pass.

## Coverage

- `computeInvoice golden files › 02 exclusive, flat discount, taxed service charge matches the hand-checked invoice` (unit, golden)
- `computeInvoice golden files › 04 inclusive, percent discount, untaxed service charge matches the hand-checked invoice` (unit, golden)
- `computeInvoice golden files › 08 exclusive, 100% discount matches the hand-checked invoice` (unit, golden)
- `computeInvoice properties › splits the order discount so line discounts sum exactly to it` (unit, property)
- `computeInvoice › keeps an inclusive line at its menu price when the discount leaves it untouched, and taxes a discounted one on what is left` (unit)
- `allocateLargestRemainder › rounds every share down, then gives the leftover paise to the largest remainders` (unit)
- `allocateLargestRemainder › breaks a tie in remainders in favour of the earlier weight` (unit)
- `allocateLargestRemainder › orders a tie in remainders by the tie-break it is given, not by position` (unit)
- `allocateLargestRemainder › gives nothing to a zero weight, and allocates zero over zero weights` (unit)
- `allocateLargestRemainder › sums exactly to the total, never exceeds a weight, and stays within a paisa of pro rata` (unit, property)
- The discount reason (kept with the order): **not built** here; it is not part of the calculation.

Command: `pnpm --filter @bhojnalya/billing test`

## References

- [ADR 0003 Money is integer paise](../../../../docs/decisions/0003-money-is-integer-paise.md)
- [ADR 0017 A discount comes off the taxable value, and service charge is charged on what remains](../../../../docs/decisions/0017-a-discount-comes-off-the-taxable-value-and-service-charge-is-charged-on-what-remains.md)
- [ADR 0028 A bill adds up the same whatever order its lines are in, and a discount larger than the bill is capped](../../../../docs/decisions/0028-a-bill-adds-up-the-same-whatever-order-its-lines-are-in-and-a-discount-larger-than-the-bill-is-capped.md)
