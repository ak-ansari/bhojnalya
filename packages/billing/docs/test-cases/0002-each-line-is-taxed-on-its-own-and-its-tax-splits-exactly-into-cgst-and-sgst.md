---
type: Test Case
title: "2. Each line is taxed on its own, and its tax splits exactly into CGST and SGST"
description: Protects the CGST/SGST figures on the bill and in the GST summary, and the menu price of a GST-inclusive item.
tags: [test-cases, billing, gst]
status: Accepted
origin_repo: bhojnalya
timestamp: 2026-10-14T00:00:00Z
---

# 2. Each line is taxed on its own, and its tax splits exactly into CGST and SGST

Date: 2026-10-14

## Status

Accepted

## Given

- A GST-registered outlet whose menu prices either exclude GST or include it.
- Lines at one or more GST rates, the item's own rate overriding the default.

## When

1. The engine computes the invoice.

## Then

- With prices **excluding** GST, a line's tax is its rate applied to its
  taxable value, rounded half up.
- **With prices including GST, an undiscounted line costs exactly its menu
  price**: its taxable value is extracted from the price, rounded half up, and
  its tax is the rest. A guest never pays a paisa more or less than the menu
  says.
- **Every line's CGST and SGST add up exactly to its tax**: CGST is half the
  tax rounded half up, SGST is what remains, so they differ by at most a
  paisa and the difference stays on that line.
- The invoice's tax, CGST and SGST are the sums over its lines (and a taxed
  service charge), and the tax summary has one row per rate, lowest first,
  whose amounts add up to the invoice's.

## Variations

| Line | Price mode | Taxable | Tax | CGST / SGST |
| :-- | :-- | :-- | :-- | :-- |
| ₹125.00 at 5% | excluding | ₹125.00 | ₹6.25 | ₹3.13 / ₹3.12 |
| ₹20.00 at 18% | excluding | ₹20.00 | ₹3.60 | ₹1.80 / ₹1.80 |
| ₹180.00 at 5% | including | ₹171.43 | ₹8.57 | ₹4.29 / ₹4.28 |
| ₹50.00 at 12% | including | ₹44.64 | ₹5.36 | ₹2.68 / ₹2.68 |
| ₹0.07 at 28% | including | ₹0.05 | ₹0.02 | ₹0.01 / ₹0.01 |
| ₹1.05 at 5% | including | ₹1.00 | ₹0.05 | ₹0.03 / ₹0.02 |
| ₹80.00 at 5% | including | ₹76.19 | ₹3.81 | ₹1.91 / ₹1.90 |

## Procedure

### Setup

`pnpm install` at the repo root on Node 22.

### Run

`pnpm --filter @bhojnalya/billing test`

### Verify

The golden files 01, 03, 07 and 09 and the properties below pass.

## Coverage

- `computeInvoice golden files › 01 exclusive, no discount matches the hand-checked invoice` (unit, golden)
- `computeInvoice golden files › 03 inclusive, no discount matches the hand-checked invoice` (unit, golden)
- `computeInvoice golden files › 07 inclusive, paise boundaries matches the hand-checked invoice` (unit, golden)
- `computeInvoice golden files › 09 the sync contract fixture invoice matches the hand-checked invoice` (unit, golden: the same bill and totals as the sync contract's push fixture)
- `computeInvoice properties › splits every line and the service charge into CGST + SGST = tax, at most a paisa apart` (unit, property)
- `computeInvoice properties › charges an undiscounted inclusive line exactly its menu price` (unit, property)
- `computeInvoice › applies a per-item rate and lists the tax summary by rate, ascending` (unit)
- Inter-state supply (IGST): **not built**; every bill is intra-state.

Command: `pnpm --filter @bhojnalya/billing test`

## References

- [ADR 0003 Money is integer paise](../../../../docs/decisions/0003-money-is-integer-paise.md)
- [ADR 0017 A discount comes off the taxable value, and service charge is charged on what remains](../../../../docs/decisions/0017-a-discount-comes-off-the-taxable-value-and-service-charge-is-charged-on-what-remains.md)
