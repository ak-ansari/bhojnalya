---
type: Decision
title: The billing engine is pure, and the server re-runs it
description: Billing is a deterministic calculation with no I/O, shared by the till and the server; the server recomputes every synced invoice and stores a mismatch flagged for review, never dropping it.
tags: [adr, billing, gst, sync, offline]
timestamp: 2026-10-14T00:00:00Z
---

# 4. The billing engine is pure, and the server re-runs it

Date: 2026-10-14

## Status

Accepted

## Context

The till computes the bill offline and prints it (N2, N6). The printed bill is
then a legal fact: the customer has it and has paid against it. The server
needs its own view of whether that bill was correct, because a bug in the
till, a stale menu, or a modified client would otherwise go straight into the
owner's GST figures (G1, R4).

For the server to check the till, both must calculate from the same rules and
the same inputs and get the same answer. That only holds if the calculation
depends on nothing but its inputs. No clock, no database read, no settings
looked up halfway through, no random source. Anything the calculation reads
from its surroundings is something the two sides can see differently.

The TRD describes the server's response to a mismatch in two ways: its billing
section says the server "rejects or flags" the invoice, and its sync section
says the invoice is "still stored as issued … flagged … never dropped". The
project instructions settle this in favour of the second. Rejecting an invoice
the customer already holds does not undo it. It only removes the platform's
record of it, which breaks the gap-free series
([ADR 0007](0007-an-invoice-number-comes-from-a-device-series.md)) and makes
the owner's books disagree with the paper.

## Decision

Billing is a **pure, deterministic calculation**. It takes the lines (with the
prices, rates and modifiers snapshotted on the order), the outlet's tax and
price modes, and the discount and service-charge choices. It returns the
complete bill. It does no I/O and reads nothing else. The same code runs on the
till and on the server ([ADR 0002](0002-one-language-runs-on-the-till-and-the-server.md)).

The server **re-runs the calculation on every synced invoice** and compares
the result with what the till issued.

On a mismatch, the invoice is **stored exactly as issued** and flagged as
needing review, and the owner is alerted. Synced data is never dropped,
rewritten or refused because of a mismatch. The till's figures stand as the
record of what was printed, and the server's figures are kept beside them for
the review.

Because it is the code most likely to cause a compliance error, the engine is
held to a higher bar than the rest of the system: every branch covered,
property tests over generated bills for the reconciliation invariants of
[ADR 0003](0003-money-is-integer-paise.md), and golden files of hand-checked
invoices across inclusive and exclusive pricing, discount, service charge and
composition.

## Consequences

Correctness of the bill can be tested completely in isolation, quickly and
without any infrastructure. The server check is a comparison, not a second
implementation.

A mismatch never loses data, and it never blocks a till that is trying to
empty its outbox. The cost is that the platform can hold invoices it believes
are wrong. Every report has to know that a flagged invoice exists, and someone
has to look at each one. A flag that nobody reviews is only a log line.

A rule change creates a window where tills on the old engine and a server on
the new one disagree about every bill. Rolling out a billing change therefore
needs a version carried with each invoice, or a plan to tell expected flags
apart from real ones. This ADR does not decide which.

Keeping the engine pure means everything it needs must be passed in, including
values that feel like settings. That makes the call sites longer, and that is
the intended trade-off.
