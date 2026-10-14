---
type: Test Case
title: "4. A price shows in rupees with Indian grouping, exact to the paisa"
description: Protects the guest from a price that differs from the bill by a rounding or float error.
tags: [test-cases, qr, menu, money]
status: Proposed
origin_repo: bhojnalya
timestamp: 2026-10-14T00:00:00Z
---

# 4. A price shows in rupees with Indian grouping, exact to the paisa

Date: 2026-10-14

## Status

Proposed

## Given

- An amount held as a whole number of paise.

## When

1. The menu shows it.

## Then

- It shows with the rupee sign and Indian digit grouping (lakhs, crores).
- **Whole rupees show no decimals; any paise show as exactly two decimals.**
- **Every digit survives, however large**: the amount is never turned into a
  floating-point number on its way to the screen.
- Negative amounts carry a leading minus.

## Variations

| Amount | Shown |
| :-- | :-- |
| ₹150.00 | ₹150 |
| ₹1,00,000.00 | ₹1,00,000 |
| ₹150.50 | ₹150.50 |
| ₹0.05 | ₹0.05 |
| ₹0.00 | ₹0 |
| −₹123.45 | -₹123.45 |
| ₹9,00,71,99,25,47,40,991.99 (beyond float precision) | ₹9,00,71,99,25,47,40,991.99 |

## Procedure

### Setup

`pnpm install` at the repo root on Node 22.

### Run

`pnpm --filter @bhojnalya/menu dev`, open `/t/anything`.

### Verify

Classic Cold Coffee shows ₹150; Iced Americano shows ₹130.50.

## Coverage

- `formatINR › groups whole rupees the Indian way and drops the paise` (unit)
- `formatINR › shows two decimals when there are paise` (unit)
- `formatINR › formats zero and negative amounts` (unit)
- `formatINR › keeps every digit of an amount too large for a float` (unit)
- `MenuPage › shows each price in rupees from paise` (component)

Command: `pnpm --filter @bhojnalya/menu test`

## References

- [ADR 0003](../../../../docs/decisions/0003-money-is-integer-paise.md)
