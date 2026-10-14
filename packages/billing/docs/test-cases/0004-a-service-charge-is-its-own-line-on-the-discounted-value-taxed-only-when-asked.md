---
type: Test Case
title: "4. A service charge is its own line on the discounted value, taxed only when asked"
description: Protects the guest from a hidden or over-stated service charge, and the GST summary from a wrongly taxed one.
tags: [test-cases, billing, service-charge]
status: Accepted
origin_repo: bhojnalya
timestamp: 2026-10-14T00:00:00Z
---

# 4. A service charge is its own line on the discounted value, taxed only when asked

Date: 2026-10-14

## Status

Accepted

## Given

- A bill with a service charge at some percentage, marked as taxed or not,
  and the outlet's default GST rate. Whether GST applies to service charge is
  the outlet's setting.

## When

1. The engine computes the invoice.

## Then

- With no service charge (off, or removed at the guest's request) the
  invoice has none, and nothing else changes.
- **The service charge is its percentage of the items' taxable value after
  the discount**, rounded half up, and is its own amount on the invoice, never
  folded into a line.
- When it is taxed, it is taxed at the outlet's default rate, whatever rates
  the items carry; its tax splits into CGST and SGST like a line's, and it
  appears in the tax summary at that rate.
- When it is not taxed, it carries no tax and is not in the tax summary.
- An outlet without GST registration charges no GST on it, even when it is
  marked as taxed ([billing 0005](./0005-a-composition-or-unregistered-outlet-issues-a-bill-of-supply-with-no-tax.md)).

## Variations

| Items after discount | Charge | Taxed (outlet rate) | Amount | Its tax |
| :-- | :-- | :-- | :-- | :-- |
| ₹259.00 | 10% | yes (5%) | ₹25.90 | ₹1.30 |
| ₹441.25 | 5% | no | ₹22.06 | ₹0.00 |
| ₹80.00 of 18% items (₹100.00 less ₹20.00) | 10% | yes (5%) | ₹8.00 | ₹0.40 |
| ₹0.00 | 10% | yes (5%) | ₹0.00 | ₹0.00 |
| ₹115.00, composition outlet | 10% | yes, ignored | ₹11.50 | ₹0.00 |

## Procedure

### Setup

`pnpm install` at the repo root on Node 22.

### Run

`pnpm --filter @bhojnalya/billing test`

### Verify

Golden files 02, 04, 05 and 08 and the unit tests below pass.

## Coverage

- `computeInvoice › charges a service charge on the discounted item value, taxed at the outlet rate in its own summary row` (unit)
- `computeInvoice › leaves an untaxed service charge out of the tax summary` (unit)
- `computeInvoice golden files › 02 exclusive, flat discount, taxed service charge matches the hand-checked invoice` (unit, golden)
- `computeInvoice golden files › 04 inclusive, percent discount, untaxed service charge matches the hand-checked invoice` (unit, golden)
- `computeInvoice golden files › 05 composition, discount, service charge matches the hand-checked invoice` (unit, golden)
- `computeInvoice golden files › 08 exclusive, 100% discount matches the hand-checked invoice` (unit, golden)
- `computeInvoice properties › splits every line and the service charge into CGST + SGST = tax, at most a paisa apart` (unit, property)
- Removing the service charge from a bill on the till: **not built**.

Command: `pnpm --filter @bhojnalya/billing test`

## References

- [ADR 0017 A discount comes off the taxable value, and service charge is charged on what remains](../../../../docs/decisions/0017-a-discount-comes-off-the-taxable-value-and-service-charge-is-charged-on-what-remains.md)
