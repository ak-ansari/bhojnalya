---
type: Test Case
title: "9. A cancelled invoice keeps its row and number, and its status is derived"
description: Lets reports and screens show an invoice's status and what was paid without a status field anyone could overwrite.
tags: [test-cases, billing, append-only, rls]
status: Proposed
origin_repo: bhojnalya
timestamp: 2026-10-14T00:00:00Z
---

# 9. A cancelled invoice keeps its row and number, and its status is derived

Date: 2026-10-14

## Status

Proposed

## Given

- A tenant with two outlets, each with a till, and another tenant with its
  own invoice.

## When

1. Two ₹105.00 invoices are issued in the first outlet. The first gets two
   payments, ₹50.00 and ₹55.00. The second gets a cancellation with the reason
   "Wrong table".
2. The invoices are read with their status, in a context holding only the
   first outlet.

## Then

- **The first reads as issued with ₹105.00 paid; the second reads as
  cancelled, with its number, its reason and nothing paid.**
- The read shows only the context's own tenant and outlet: the other tenant's
  invoice and the second outlet's invoice do not appear.

## Procedure

### Setup

`pnpm install` at the repo root on Node 22, with Docker running. The run
starts its own Postgres container with the same roles as `infra/`, and
applies the migrations as the migration owner.

### Run

`pnpm --filter @bhojnalya/db test:int`

### Verify

The `invoices_with_status` suite passes.

## Coverage

- `invoices_with_status › derives cancelled from a cancellation record and sums what was paid` (integration)
- `invoices_with_status › shows a context only its own tenant's and its own outlets' invoices` (integration)

Command: `pnpm --filter @bhojnalya/db test:int`

## References

- [db 0007](./0007-an-issued-invoice-and-everything-recorded-against-it-is-never-changed-or-removed.md)
- [db 0002](./0002-a-request-reaches-only-the-outlets-it-was-given.md)
- [ADR 0008](../../../../docs/decisions/0008-financial-records-are-append-only.md)
