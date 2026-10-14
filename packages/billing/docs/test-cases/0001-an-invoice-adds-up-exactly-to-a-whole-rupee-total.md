---
type: Test Case
title: "1. An invoice adds up exactly to a whole-rupee total"
description: Protects the printed bill and the GST return from totals that are off by a paisa, or that differ between the till and the server.
tags: [test-cases, billing, round-off]
status: Accepted
origin_repo: bhojnalya
timestamp: 2026-10-14T00:00:00Z
---

# 1. An invoice adds up exactly to a whole-rupee total

Date: 2026-10-14

## Status

Accepted

## Given

- A bill of one or more lines, each with a menu price in paise, optional
  modifier prices, a whole quantity and a GST rate.
- Optionally an order discount ([billing 0003](./0003-an-order-discount-comes-off-taxable-value-and-its-line-shares-sum-exactly-to-it.md))
  and a service charge ([billing 0004](./0004-a-service-charge-is-its-own-line-on-the-discounted-value-taxed-only-when-asked.md)).

## When

1. The engine computes the invoice.

## Then

- **Subtotal − discount + service charge + tax + round-off is exactly the
  grand total**, to the paisa, for every bill. A bill whose parts do not add
  up cannot be filed and cannot be checked by the server.
- The subtotal is the sum of every line's taxable value before discount, and
  each line's taxable value plus its tax is its line total.
- **The grand total is a whole number of rupees, and the round-off is its own
  amount, from −₹0.49 to +₹0.50.** A half rounds up.
- Each line is (unit price + modifier prices) × quantity, so a modifier is
  charged once per unit.
- No line, subtotal, discount, service charge or grand total is negative.
- The same bill always gives the same invoice, so the server's recomputation
  can be compared with the till's by exact equality.

## Variations

| Before round-off | Round-off | Grand total |
| :-- | :-- | :-- |
| ₹406.85 | +₹0.15 | ₹407.00 |
| ₹304.48 | −₹0.48 | ₹304.00 |
| ₹126.50 | +₹0.50 | ₹127.00 |
| ₹24.49 | −₹0.49 | ₹24.00 |
| ₹350.00 | ₹0.00 | ₹350.00 |
| ₹0.00 (100% discount) | ₹0.00 | ₹0.00 |

## Procedure

### Setup

`pnpm install` at the repo root on Node 22.

### Run

`pnpm --filter @bhojnalya/billing test`

### Verify

The `computeInvoice golden files` and `computeInvoice properties` suites pass,
and coverage is 100%. Each golden file under `packages/billing/src/golden/`
shows its arithmetic in `working`, so it can be checked by hand.

## Coverage

- `computeInvoice golden files › 01 exclusive, no discount matches the hand-checked invoice` (unit, golden)
- `computeInvoice golden files › 02 exclusive, flat discount, taxed service charge matches the hand-checked invoice` (unit, golden)
- `computeInvoice golden files › 05 composition, discount, service charge matches the hand-checked invoice` (unit, golden)
- `computeInvoice golden files › 06 unregistered, inclusive matches the hand-checked invoice` (unit, golden)
- `computeInvoice golden files › 08 exclusive, 100% discount matches the hand-checked invoice` (unit, golden)
- `computeInvoice properties › reconciles: subtotal − discount + service charge + tax + round-off = grand total` (unit, property)
- `computeInvoice properties › rounds to a whole rupee with a round-off of −49 to +50 paise` (unit, property)
- `computeInvoice properties › never produces a negative amount on any line` (unit, property)
- `computeInvoice properties › gives the same output for the same input, every time` (unit, property)
- `computeInvoice › multiplies modifiers by quantity along with the unit price` (unit)
- `roundHalfUp › rounds %i / %i to %i, halves up` (unit)
- `roundHalfUp › is never more than half a unit from the exact quotient` (unit, property)
- The server re-running the engine on a synced invoice and flagging a mismatch: **not built**.

Command: `pnpm --filter @bhojnalya/billing test`

## References

- [ADR 0003 Money is integer paise](../../../../docs/decisions/0003-money-is-integer-paise.md)
- [ADR 0004 The billing engine is pure, and the server re-runs it](../../../../docs/decisions/0004-the-billing-engine-is-pure-and-the-server-re-runs-it.md)
