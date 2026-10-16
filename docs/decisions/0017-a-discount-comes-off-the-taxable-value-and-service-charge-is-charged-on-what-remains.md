---
type: Decision
title: A discount comes off the taxable value, and service charge is charged on what remains
description: An order discount reduces taxable value before tax even on tax-inclusive prices, a discounted line is re-taxed on what is left, and service charge is a share of the discounted value whose GST is the outlet's choice.
tags: [adr, billing, gst, discount, service-charge]
timestamp: 2026-10-14T00:00:00Z
---

# 17. A discount comes off the taxable value, and service charge is charged on what remains

Date: 2026-10-14

## Status

Proposed. Amended by [ADR 0028](0028-a-bill-adds-up-the-same-whatever-order-its-lines-are-in-and-a-discount-larger-than-the-bill-is-capped.md): a tie for a leftover paisa no longer goes to the earlier line.

## Context

The billing rules say an order discount (P5) is applied to taxable value
before tax and split across lines so the shares add up exactly
([ADR 0003](0003-money-is-integer-paise.md)). That is unambiguous when menu
prices exclude GST. It leaves three things open, and the bill cannot be
printed until each has one answer, because the till and the server must
compute the same paise ([ADR 0004](0004-the-billing-engine-is-pure-and-the-server-re-runs-it.md)).

**Tax-inclusive prices.** Many cafés price the menu with GST included. A
guest given "₹10 off" on such a bill may expect the total to drop by exactly
₹10. If the discount comes off the taxable value, as the rules say, the total
drops by ₹10 plus the tax on it. The alternative, taking the discount off the
inclusive price and then extracting tax again, keeps "₹10 off" literal but
means the discount no longer reduces taxable value by the stated amount, and
the line shares no longer sum to it in taxable terms.

**What happens to an inclusive line's tax.** Without a discount, an inclusive
line's tax is what its menu price holds above the extracted taxable value, so
the guest pays exactly the menu price. Taxing the taxable value at the rate
instead can differ by a paisa (₹0.07 at 28% is ₹0.05 + ₹0.02, but 28% of
₹0.05 rounds to ₹0.01), and the bill would no longer match the menu.

**Service charge.** It is optional and its own line (P4), but the rules say
neither what it is a percentage of nor, for certain, whether GST applies to it
(TRD §22 Q4, still open with a CA).

## Decision

**A discount always comes off taxable value**, whatever the price mode. A flat
discount is that many paise of taxable value. A percentage is taken of the
subtotal of taxable values and rounded once, before it is split.

**An inclusive line the discount does not touch keeps its menu price**: its
tax is the menu amount less its taxable value. **A line that receives any
share of the discount is taxed at its rate on its reduced taxable value**, the
same way in both price modes. The largest-remainder split gives a leftover
paisa to the earliest line among equal remainders, so the split, and with it
which lines are re-taxed, is deterministic.

**Service charge is a percentage of the discounted taxable value of the
items**, shown on its own line. Whether GST is charged on it is passed in with
the bill rather than decided by the calculation, and when it is, the rate is
the outlet's default item rate, also passed in, never one inferred from the
items on the bill. When charged, its tax is split
into central and state halves like any line and appears in the tax summary at
its own rate. An outlet without GST registration charges no GST on it,
whatever is passed in.

## Consequences

A flat discount on an inclusive-price bill reduces the total by more than its
face value (₹10 off at 5% takes ₹10.50 off). Staff who want the bill to fall
by exactly ₹10 enter ₹9.52. The till has to show the effect before the bill is
printed, or owners will read it as a bug.

An inclusive-price line jumps by at most a paisa when the first paisa of
discount reaches it. That is the cost of every undiscounted line matching the
menu exactly.

Service charge never charges a guest on value that was discounted away, and a
fully discounted bill carries no service charge.

If a CA settles that GST never applies to service charge, nothing in the
calculation changes; the outlet simply stops asking for it. If the answer is a
rule the calculation cannot express (for example a rate that depends on the
items on the bill), this record is superseded. Because the outlet's rate is an
input, the server can only re-run a bill with a taxed service charge if the
rate in force when the bill was issued travels with it.

The rule changes nothing for outlets without registration: their bill has no
tax at all, so the discount and service charge reduce or add to the amount
payable directly.
