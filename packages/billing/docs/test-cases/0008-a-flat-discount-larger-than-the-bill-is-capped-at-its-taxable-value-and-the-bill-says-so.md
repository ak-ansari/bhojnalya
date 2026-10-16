---
type: Test Case
title: "8. A flat discount larger than the bill is capped at its taxable value, and the bill says so"
description: Protects the cashier who comps an item at its menu price from an error, and the till from showing a discount it did not apply.
tags: [test-cases, billing, discount]
status: Accepted
origin_repo: bhojnalya
timestamp: 2026-10-14T00:00:00Z
---

# 8. A flat discount larger than the bill is capped at its taxable value, and the bill says so

Date: 2026-10-14

## Status

Accepted

## Given

- A bill with a flat order discount larger than the subtotal of its taxable
  values. On tax-inclusive prices this happens whenever an item is comped at
  its menu price, because the discount comes off the value before tax
  ([billing 0003](./0003-an-order-discount-comes-off-taxable-value-and-its-line-shares-sum-exactly-to-it.md)).

## When

1. The engine computes the invoice.

## Then

- **The discount applied is the subtotal, not the amount asked, and the bill
  is ₹0.00.** Nothing is taxable, so there is no tax and no service charge.
- **The result says the discount was capped**, so the till can tell the
  cashier why the discount on the bill differs from what they keyed in. A
  discount at or below the subtotal, a percentage discount and no discount
  all say it was not.
- The discount never exceeds the subtotal, for any bill.

## Variations

| Bill | Flat discount asked | Discount applied | Capped | Payable |
| :-- | :-- | :-- | :-- | :-- |
| ₹105.00 incl. 5% (₹100.00 taxable) | ₹105.00 | ₹100.00 | yes | ₹0.00 |
| ₹10.00 excl. 5% | ₹10.01 | ₹10.00 | yes | ₹0.00 |
| ₹10.00 excl. 5% | ₹10.00 | ₹10.00 | no | ₹0.00 |
| ₹10.00 excl. 5% | none | ₹0.00 | no | ₹10.50 → ₹11.00 |

## Procedure

### Setup

`pnpm install` at the repo root on Node 22.

### Run

`pnpm --filter @bhojnalya/billing test`

### Verify

Golden file 10 and the tests below pass.

## Coverage

- `computeInvoice golden files › 10 inclusive, a comp capped at the taxable value matches the hand-checked invoice` (unit, golden)
- `computeInvoice › caps a flat discount at the taxable value and says so, rather than refusing the bill` (unit)
- `computeInvoice properties › never takes more than the subtotal off, and says so exactly when it caps a flat discount` (unit, property)
- The till showing the capped notice to the cashier: **not built**.

Command: `pnpm --filter @bhojnalya/billing test`

## References

- [billing 0007](./0007-a-bill-no-outlet-could-issue-is-refused.md)
- [ADR 0017 A discount comes off the taxable value, and service charge is charged on what remains](../../../../docs/decisions/0017-a-discount-comes-off-the-taxable-value-and-service-charge-is-charged-on-what-remains.md)
- [ADR 0028 A bill adds up the same whatever order its lines are in, and a discount larger than the bill is capped](../../../../docs/decisions/0028-a-bill-adds-up-the-same-whatever-order-its-lines-are-in-and-a-discount-larger-than-the-bill-is-capped.md)
