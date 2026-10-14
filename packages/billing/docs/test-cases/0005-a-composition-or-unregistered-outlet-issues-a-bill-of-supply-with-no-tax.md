---
type: Test Case
title: "5. A composition or unregistered outlet issues a Bill of Supply with no tax"
description: Protects outlets that may not collect GST from printing tax on their bills.
tags: [test-cases, billing, gst, composition]
status: Accepted
origin_repo: bhojnalya
timestamp: 2026-10-14T00:00:00Z
---

# 5. A composition or unregistered outlet issues a Bill of Supply with no tax

Date: 2026-10-14

## Status

Accepted

## Given

- An outlet registered under the composition scheme, or not registered for
  GST, with items that carry GST rates.

## When

1. The engine computes the invoice.

## Then

- **The document is a "Bill of Supply", with no tax anywhere**: every line,
  the service charge and the invoice have zero tax, CGST and SGST, the tax
  summary is empty, and each line's rate reads zero.
- The menu price is charged whole whichever way prices are set: no tax is
  extracted from an inclusive price.
- Discount, service charge and round-off apply as on any bill.
- **A composition outlet's bill asks for the composition declaration to be
  printed**; an unregistered outlet's does not.
- A registered regular outlet's document is a "Tax Invoice" with no
  declaration.

## Variations

| Outlet | Document | Declaration | Tax |
| :-- | :-- | :-- | :-- |
| regular | Tax Invoice | no | charged |
| composition | Bill of Supply | yes | none |
| unregistered | Bill of Supply | no | none |

## Procedure

### Setup

`pnpm install` at the repo root on Node 22.

### Run

`pnpm --filter @bhojnalya/billing test`

### Verify

Golden files 05 and 06 and the property below pass.

## Coverage

- `computeInvoice golden files › 05 composition, discount, service charge matches the hand-checked invoice` (unit, golden)
- `computeInvoice golden files › 06 unregistered, inclusive matches the hand-checked invoice` (unit, golden)
- `computeInvoice properties › charges no tax at all on a Bill of Supply` (unit, property)
- The declaration's wording and the printed Bill of Supply: **not built**.

Command: `pnpm --filter @bhojnalya/billing test`

## References

- [ADR 0004 The billing engine is pure, and the server re-runs it](../../../../docs/decisions/0004-the-billing-engine-is-pure-and-the-server-re-runs-it.md)
