---
type: Decision
title: Financial records are append-only
description: Invoices, their lines and payments are never updated or deleted by the application; a cancellation is a new record, status is derived from what has been recorded, and every order, ticket and invoice snapshots what it sold.
tags: [adr, billing, gst, audit, database]
timestamp: 2026-10-14T00:00:00Z
---

# 8. Financial records are append-only

Date: 2026-10-14

## Status

Accepted

## Context

G4 says invoices are never deleted, and a cancellation produces a cancelled
record with a reason. N5 says invoices and payments are append-only and
auditable, with every financial change logged by user, device and time. An
issued bill has already been printed and handed over. Changing the stored copy
afterwards makes the record disagree with the paper.

A rule in application code ("never update an invoice") holds only for code
that goes through the right function. It does not stop the next feature, a
data fix run by hand, or a sync bug that writes the same invoice twice.

A related hazard is indirect editing. An invoice that refers to the current
menu item for its name, price or tax rate changes whenever the menu changes.
A price rise next month would then rewrite last month's bills.

## Decision

The application's database role has **no permission to update or delete**
invoices, invoice lines or payments. This is enforced by the database, not by
convention, so it applies to every caller.

**A cancellation is a new record** that refers to the invoice, with its reason
and who made it. An invoice's status is **derived** from the records about it.
It is never stored as a field that can be overwritten. A cancelled invoice
keeps its number ([ADR 0007](0007-an-invoice-number-comes-from-a-device-series.md)).

**Orders, kitchen tickets and invoices snapshot** the item name, price, tax
rate and HSN/SAC code at the moment they are created. Later menu edits never
reach a historical document.

## Consequences

The financial history cannot be rewritten by any code path the application
has, including ones not yet written. An auditor, or the owner's accountant,
can trust that what the platform holds is what was issued.

Correcting a mistake is always additive: cancel and reissue. That matches how
GST treats issued invoices, but it means more records and reports that must
follow the derivation instead of reading a status column.

Snapshots duplicate data on every line. Storage is cheap at this scale, and a
historically correct bill is worth more than normalisation.

Database-level grants cannot be seen from application code. A developer who
writes an update to an invoice finds out at runtime. Integration tests against
the real database are the only level that can show the grant is in place.
Unit tests cannot.

Server re-validation ([ADR 0004](0004-the-billing-engine-is-pure-and-the-server-re-runs-it.md))
records a mismatch beside the invoice. It never corrects the invoice, which
this decision would not allow anyway.
