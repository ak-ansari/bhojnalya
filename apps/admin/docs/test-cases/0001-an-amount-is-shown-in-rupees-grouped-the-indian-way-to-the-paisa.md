---
type: Test Case
title: "1. An amount is shown in rupees, grouped the Indian way, to the paisa"
description: Protects every amount the owner reads from rounding, float drift and western digit grouping.
tags: [test-cases, money, display]
status: Accepted
origin_repo: bhojnalya
timestamp: 2026-10-14T00:00:00Z
---

# 1. An amount is shown in rupees, grouped the Indian way, to the paisa

Date: 2026-10-14

## Status

Accepted

## Given

- An amount of money held as a whole number of paise.

## When

1. The admin shows it to a person.

## Then

- It reads as rupees with the rupee sign and exactly two decimals, so ₹105
  and ₹105.00 never both appear.
- Rupees are grouped in thousands, then lakhs, then crores, as an Indian
  owner reads them.
- A negative amount puts the minus sign before the rupee sign.
- **Every paisa survives, however large the amount**: the figure is never
  passed through a floating-point number, which would move a large amount by
  a rupee.

## Variations

| Amount held | Shown as |
| :-- | :-- |
| 0 paise | ₹0.00 |
| 1 paisa | ₹0.01 |
| 10,500 paise | ₹105.00 |
| 1,23,45,678 paise | ₹1,23,456.78 |
| −50 paise | -₹0.50 |
| 2^53 + 7 paise | ₹9,00,71,99,25,47,409.99 |

## Procedure

### Setup

`pnpm install` at the repo root on Node 22.

### Run

`pnpm --filter @bhojnalya/admin test`

### Verify

The `formatINR` suite passes.

## Coverage

- `formatINR › shows paise as rupees with two decimals` (unit)
- `formatINR › groups rupees the Indian way, in lakhs and crores` (unit)
- `formatINR › puts the minus sign before the rupee symbol` (unit)
- `formatINR › keeps every paisa of an amount too large for a float` (unit)
- No admin screen shows an amount yet: **not built**.

Command: `pnpm --filter @bhojnalya/admin test`

## References

- [ADR 0003 Money is integer paise](../../../../docs/decisions/0003-money-is-integer-paise.md)
