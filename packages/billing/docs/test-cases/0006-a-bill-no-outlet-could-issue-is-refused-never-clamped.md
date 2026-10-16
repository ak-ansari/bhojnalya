---
type: Test Case
title: "6. A bill no outlet could issue is refused, never clamped"
description: Protects the printed bill from silently "fixed" input that would make it disagree with the order.
tags: [test-cases, billing, validation]
status: Superseded
origin_repo: bhojnalya
timestamp: 2026-10-14T00:00:00Z
---

# 6. A bill no outlet could issue is refused, never clamped

Date: 2026-10-14

## Status

Superseded by [billing 0007](./0007-a-bill-no-outlet-could-issue-is-refused.md)
and [billing 0008](./0008-a-flat-discount-larger-than-the-bill-is-capped-at-its-taxable-value-and-the-bill-says-so.md):
a flat discount above the subtotal is now capped, not refused, and an
unsafe quantity is now refused.

## Given

- A bill whose input is impossible.

## When

1. The engine is asked to compute the invoice.

## Then

- **The engine refuses it with a range error** rather than clamping, guessing
  or computing a bill from part of it. A bill quietly corrected by the engine
  would print something nobody ordered.
- The impossible inputs are: no lines; a quantity below one or not whole; a
  unit price that is negative after its modifiers; a line or outlet tax rate,
  discount percentage or service charge below 0%, above 100% or not a whole
  number of basis points (hundredths of a percent); a flat discount below zero
  or above the subtotal.
- Its rounding and splitting steps also refuse amounts the engine never
  produces (a negative amount, a zero divisor, a share larger than the whole).

## Variations

| Input | Outcome |
| :-- | :-- |
| no lines | refused |
| quantity 0 | refused |
| quantity 1.5 | refused |
| tax rate 5.005% | refused |
| ₹1.00 item with a −₹1.01 modifier | refused |
| flat discount ₹10.01 on a ₹10.00 bill | refused |
| 100% discount | ₹0.00 bill ([billing 0003](./0003-an-order-discount-comes-off-taxable-value-and-its-line-shares-sum-exactly-to-it.md)) |
| discount 100.01% | refused |

## Procedure

### Setup

`pnpm install` at the repo root on Node 22.

### Run

`pnpm --filter @bhojnalya/billing test`

### Verify

The refusal tests below pass.

## Coverage

- `computeInvoice › refuses %s rather than guessing` (unit, one row per impossible input)
- `roundHalfUp › refuses %i / %i, which the engine never divides` (unit)
- `allocateLargestRemainder › refuses %s` (unit)
- Rejecting the same input at the API boundary before it reaches the engine: **not built**.

Command: `pnpm --filter @bhojnalya/billing test`

## References

- [ADR 0004 The billing engine is pure, and the server re-runs it](../../../../docs/decisions/0004-the-billing-engine-is-pure-and-the-server-re-runs-it.md)
