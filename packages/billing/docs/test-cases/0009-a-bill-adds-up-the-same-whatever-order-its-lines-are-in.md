---
type: Test Case
title: "9. A bill adds up the same whatever order its lines are in"
description: Protects a correct bill from being flagged for review because the server read its lines back in another order than the till held them.
tags: [test-cases, billing, discount, determinism]
status: Accepted
origin_repo: bhojnalya
timestamp: 2026-10-14T00:00:00Z
---

# 9. A bill adds up the same whatever order its lines are in

Date: 2026-10-14

## Status

Accepted

## Given

- A bill with an order discount whose split leaves a paisa that two or more
  lines have an equal claim to
  ([billing 0003](./0003-an-order-discount-comes-off-taxable-value-and-its-line-shares-sum-exactly-to-it.md)).
- The same bill with its lines in another order.

## When

1. The engine computes both.

## Then

- **Every total is the same**: subtotal, discount, taxable value, service
  charge, tax summary, tax, CGST, SGST, round-off and grand total.
- **The leftover paisa goes to a line chosen by what the line is, never by
  where it sits**: the higher tax rate first, then the larger taxable value,
  then the larger menu amount, then the lower order item id.
- When the lines carry order item ids, each line's own figures are the same
  in either order. Without ids, lines equal in rate, taxable value and menu
  amount are interchangeable, and the earlier takes the paisa.
- Lines come back in the order they were given.

## Variations

| Lines | Discount | Paisa goes to | Payable (either order) |
| :-- | :-- | :-- | :-- |
| ₹8.30 at 5%, ₹8.30 at 18%, exclusive | ₹0.01 | the 18% line | ₹18.50 → ₹19.00 |
| ₹0.03 and ₹0.02 at 28%, inclusive (₹0.02 taxable each) | ₹0.01 | the ₹0.03 line | ₹0.03 → ₹0.00 |
| ₹110.00 twice at 5%, inclusive, ids …02 and …01 | ₹0.01 | id …01 | ₹219.99 → ₹220.00 |

## Procedure

### Setup

`pnpm install` at the repo root on Node 22.

### Run

`pnpm --filter @bhojnalya/billing test`

### Verify

Golden file 11, every golden file reversed, and the tests below pass.

## Coverage

- `computeInvoice golden files › 11 exclusive, a remainder tie goes to the higher rate matches the hand-checked invoice` (unit, golden)
- `computeInvoice golden files › %s gives the same invoice with its lines listed in reverse` (unit, golden, every file)
- `computeInvoice › gives the same totals whatever order the lines are in, breaking a remainder tie by the line itself` (unit)
- `computeInvoice › breaks a tie between lines of equal rate and taxable value by the larger menu amount` (unit)
- `computeInvoice › breaks a tie between lines alike in rate and amount by their order item id` (unit)
- `computeInvoice properties › gives identical totals, and each line the same result, whatever order the lines come in` (unit, property)
- `allocateLargestRemainder › orders a tie in remainders by the tie-break it is given, not by position` (unit)
- The server re-running a synced invoice from stored lines and agreeing: **not built**.

Command: `pnpm --filter @bhojnalya/billing test`

## References

- [billing 0003](./0003-an-order-discount-comes-off-taxable-value-and-its-line-shares-sum-exactly-to-it.md)
- [ADR 0004 The billing engine is pure, and the server re-runs it](../../../../docs/decisions/0004-the-billing-engine-is-pure-and-the-server-re-runs-it.md)
- [ADR 0028 A bill adds up the same whatever order its lines are in, and a discount larger than the bill is capped](../../../../docs/decisions/0028-a-bill-adds-up-the-same-whatever-order-its-lines-are-in-and-a-discount-larger-than-the-bill-is-capped.md)
