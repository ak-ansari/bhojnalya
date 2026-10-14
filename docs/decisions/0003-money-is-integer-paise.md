---
type: Decision
title: Money is integer paise
description: Every amount is a whole number of paise, every division rounds half up at a named point, and the rounding rules for tax splits, discounts and round-off are fixed so that totals always reconcile exactly.
tags: [adr, billing, gst, money]
timestamp: 2026-10-14T00:00:00Z
---

# 3. Money is integer paise

Date: 2026-10-14

## Status

Accepted

## Context

A GST invoice is a legal document. Its lines, its tax summary by rate, its
CGST and SGST halves and its grand total must add up exactly, both on paper and
in the GST report the owner's accountant files (G1, R4). Binary floating point
cannot represent most rupee-and-paise amounts. Summing or splitting them in
floats produces totals that are off by a paisa in ways that depend on the
order of operations, so the till and the server could disagree on the same
bill.

Integers alone are not enough. Tax, inclusive-price extraction, percentage
discounts and the CGST/SGST split all divide, and each division leaves a
remainder that has to go somewhere. If the rule for where it goes is left to
each call site, it gets decided differently in different places.

The alternatives were a decimal type, or integer rupees with paise as a
fraction. A decimal type still needs a rounding policy and is slower and
clumsier to share between browser and server. Integer rupees cannot represent
real menu prices.

## Decision

Every amount is a whole number of paise, held in an integer type wide enough
that no realistic bill can overflow it. No floating-point value ever holds
money, not even as an intermediate step.

Every division rounds **half up**, and only at these points:

- **Tax on a line** is computed per line, then grouped by rate for the summary.
- **The intra-state split** gives the central half the rounded value of half
  the tax, and the state half whatever remains. The two always add up to the
  tax, and differ by at most one paisa, which is absorbed per line.
- **An order-level discount** is applied to taxable value before tax and split
  across lines pro rata by the **largest-remainder** method. Line discounts
  always sum exactly to the order discount.
- **Round-off** to the nearest rupee is its own line on the bill, never folded
  into another amount, and is never more than fifty paise either way.

Amounts are formatted for display only at the edge, in the Indian grouping
style (N10).

## Consequences

The invariant that lines, tax, service charge, discount and round-off add up
exactly to the grand total can be stated and checked mechanically for every
bill. It is what the billing engine's property tests assert.

Every remainder has one defined destination. Two implementations that follow
these rules produce the same paise, and the server can compare its result
with the till's using exact equality.

Everyone who touches money has to work in paise and convert only for display.
Entering a price or reading a report in rupees means converting at that
boundary, and a missed conversion is off by a factor of a hundred, not by a
rounding error. That is louder, but it can still ship if nothing tests it.

The integer type has to survive serialisation. Some wire formats and database
drivers turn large integers into floats or strings without warning, so every
boundary that carries money needs a test against a literal amount.
