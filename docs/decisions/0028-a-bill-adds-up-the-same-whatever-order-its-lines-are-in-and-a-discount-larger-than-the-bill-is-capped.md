---
type: Decision
title: A bill adds up the same whatever order its lines are in, and a discount larger than the bill is capped
description: A leftover discount paisa goes to a line chosen by what the line is, never where it sits, so the server's re-run cannot disagree with the till over order; a flat discount above the taxable value is cut to it and reported instead of refusing the bill.
tags: [adr, billing, gst, discount]
timestamp: 2026-10-14T00:00:00Z
---

# 28. A bill adds up the same whatever order its lines are in, and a discount larger than the bill is capped

Date: 2026-10-14

## Status

Proposed. Amends [ADR 0017](./0017-a-discount-comes-off-the-taxable-value-and-service-charge-is-charged-on-what-remains.md):
it supersedes 0017's rule that a leftover paisa goes to the earliest line
among equal remainders. The rest of 0017 stands.

## Context

An order discount is split across lines by largest remainder, and when two
lines have equal remainders one of them must take the leftover paisa
([ADR 0017](./0017-a-discount-comes-off-the-taxable-value-and-service-charge-is-charged-on-what-remains.md)).
0017 gave it to the earlier line. Which line takes it changes the bill: that
line is re-taxed at its own rate, and the round-off can tip a whole rupee.
Two lines of ₹8.30 at 5% and 18% with ₹0.01 off come to ₹18.00 in one order
and ₹19.00 in the other.

The till computes the bill offline and the server re-runs it to compare
([ADR 0004](./0004-the-billing-engine-is-pure-and-the-server-re-runs-it.md)).
Nothing promises that the server reads the lines back in the order the till
held them: lines are stored as rows, and rows have no order of their own. A
correct bill read back in another order would be flagged for review, and the
review would find nothing wrong.

The losing alternative was to keep the earlier-line rule and make line order
part of the synced invoice, so the server sorts by it before re-running. That
moves the burden onto every reader of the invoice, forever, and a single
reader who forgets reintroduces false mismatches.

A second question came from QA. A cashier comps an inclusive-price item by
keying a flat discount equal to its menu price (₹105.00 off a ₹105.00 item at
5%). A discount comes off taxable value (0017), and that item's taxable value
is ₹100.00, so the discount is ₹5.00 larger than the bill can hold. The
engine refused the bill. The cashier meant "make this free", which is
unambiguous; refusing it leaves them with an error and no bill. The losing
alternative was to keep refusing and have the till convert the comp; that
puts a billing rule in the screen, where the server's re-run cannot see it.

## Decision

**The amounts on a bill do not depend on the order of its lines.** When two
lines have equal remainders, the leftover paisa goes to the line with the
higher tax rate; if the rates are equal, to the larger taxable value; then
to the larger menu amount; then to the lower order item id. Lines equal on
all of these produce the same amounts whichever takes the paisa, so the
totals are the same in any order. With order item ids, each line's own
figures are the same too.

The rule is arbitrary in the sense that another fixed rule would do as well;
what matters is that it looks at the lines, not their positions. It does not
favour the guest: a higher-rate line taking the paisa can raise or lower the
total depending on round-off.

**A flat discount larger than the taxable value of the bill is cut to that
value**, the bill comes to nothing payable, and the result says the discount
was capped so the till can tell the cashier. A negative discount is still
refused. A percentage discount cannot exceed the bill, so it is unaffected.

## Consequences

The server can re-run a bill from its lines in any order and get the till's
figures. The cost is that "the first line gets the paisa" was easy to explain
to an owner reading a bill; the new rule needs this record.

Bills already computed under 0017's rule differ from the new rule only where
a tie fell on lines that differ in rate or amount. No bill was issued under
the old rule in production, so no stored invoice is affected; had one been,
re-running it would flag it for review, never drop it.

A cashier who keys in more discount than the bill holds gets a bill of
₹0.00, not an error. The discount recorded is what was applied, not what was
keyed in; the keyed amount survives only on the order. A till that does not
show the capped notice will look as if it ignored part of the discount.

The outlet's tax rate at the time of the bill now travels with the synced
invoice, so the server re-runs a taxed service charge at that rate and not
the outlet's current one, as 0017's consequences required.
