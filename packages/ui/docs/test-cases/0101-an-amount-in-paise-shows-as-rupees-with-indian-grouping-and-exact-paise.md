---
type: Test Case
title: "101. An amount in paise shows as rupees with Indian grouping and exact paise"
description: Protects every printed and displayed amount from float rounding and from Western digit grouping.
tags: [test-cases, money, display]
status: Proposed
origin_repo: bhojnalya
timestamp: 2026-10-14T00:00:00Z
---

# 101. An amount in paise shows as rupees with Indian grouping and exact paise

Date: 2026-10-14

## Status

Proposed

## Given

- An amount held as a whole number of paise, of any size and either sign.

## When

1. A screen displays it.

## Then

- It reads as ₹, then the rupees grouped in lakhs and crores, then a point
  and exactly two paise digits.
- An amount under one rupee keeps a leading zero and two paise digits.
- A negative amount, such as a round-off, puts the minus sign before the ₹.
- **The displayed paise are exactly the paise held, for any size of
  amount.** The amount never passes through a fractional number, so a large
  total cannot gain or lose a paisa on screen.

## Variations

| Held (paise) | Shown |
| :-- | :-- |
| 0 | ₹0.00 |
| 5 | ₹0.05 |
| 55100 | ₹551.00 |
| 12645000 | ₹1,26,450.00 |
| 1234567890 | ₹1,23,45,678.90 |
| -50 | -₹0.50 |
| 9007199254740993 | ₹9,00,71,99,25,47,409.93 |

## Procedure

### Setup

`pnpm install` at the repo root on Node 22.

### Run

`pnpm --filter @bhojnalya/ui test`

### Verify

The `formatINR` suite passes.

## Coverage

- `formatINR › groups rupees in lakhs and crores with the ₹ sign and two paise digits` (unit)
- `formatINR › shows the paise of an amount below one rupee, padded to two digits` (unit)
- `formatINR › puts the minus sign before the ₹ for a negative amount such as a round-off` (unit)
- `formatINR › stays exact beyond the largest integer a float holds` (unit)

Command: `pnpm --filter @bhojnalya/ui test`

## References

- [ADR 0003 Money is integer paise](../../../../docs/decisions/0003-money-is-integer-paise.md)
