---
type: Test Case
title: "1. Money crosses the wire as canonical paise digits and decodes to the exact amount"
description: Protects every amount that leaves or enters a device or the server from float drift, factor-of-100 mistakes and double spellings.
tags: [test-cases, money, contracts]
status: Proposed
origin_repo: bhojnalya
timestamp: 2026-10-14T00:00:00Z
---

# 1. Money crosses the wire as canonical paise digits and decodes to the exact amount

Date: 2026-10-14

## Status

Proposed

## Given

- An amount of money in a document sent between a till, the server or a
  browser.

## When

1. The document is read.
2. An amount held in memory is written back into a document.

## Then

- **An amount is read as the exact whole number of paise**, including
  amounts too large for a floating-point number to hold exactly. A bill can
  never be a paisa off because it crossed the wire.
- Writing an amount gives the same digit string, and reading that string
  gives the same amount back, for every amount. The till and the server
  compare documents and see the same money.
- **An amount sent as a number, in rupees, or in any spelling other than the
  one canonical form is refused**, not coerced. One amount has one spelling.
- An amount in memory is refused when it is a plain number. Building one
  from a number works only for a whole, safely representable number of paise.

## Variations

| Input | Outcome |
| :-- | :-- |
| `"20000"` | ₹200.00 |
| `"0"` | ₹0.00 |
| `"-50"` | −₹0.50 (a round-off) |
| `"9007199254740993"` | read exactly, beyond float precision |
| `20000` (a JSON number) | refused |
| `"200.00"`, `"020000"`, `"+20000"`, `"-0"`, `"2e4"`, `" 20000"`, `""` | refused |
| 105.5 paise, 2^53 paise as numbers | refused |

## Procedure

### Setup

`pnpm install` at the repo root on Node 22.

### Run

`pnpm --filter @bhojnalya/contracts test`

### Verify

The `PaiseWire`, `Paise` and `paise` suites pass.

## Coverage

- `PaiseWire › decodes a digit string to the exact bigint of paise` (unit)
- `PaiseWire › decodes amounts beyond the float-safe range without losing a paisa` (unit)
- `PaiseWire › encodes paise back to the digit string` (unit)
- `PaiseWire › refuses %j (%s)` (unit, table)
- `PaiseWire › round-trips every bigint through its wire string` (unit, property)
- `Paise › holds a bigint and refuses a number` (unit)
- `paise › builds paise from a safe integer or a bigint` (unit)
- `paise › refuses a fraction of a paisa and an unsafe number` (unit)
- `SyncPushRequest › refuses an amount sent as a JSON number` (unit), see contracts 0003
- Each side of a wire decoding the fixture's amounts: **not built** (the POS
  outbox and the sync API come later).

Command: `pnpm --filter @bhojnalya/contracts test`

## References

- [ADR 0003 Money is integer paise](../../../../docs/decisions/0003-money-is-integer-paise.md)
- [ADR 0018 Money crosses the wire as a string of digits](../../../../docs/decisions/0018-money-crosses-the-wire-as-a-string-of-digits.md)
