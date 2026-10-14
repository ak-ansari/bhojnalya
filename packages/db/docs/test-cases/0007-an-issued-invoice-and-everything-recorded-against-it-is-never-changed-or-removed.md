---
type: Test Case
title: "7. An issued invoice, and everything recorded against it, is never changed or removed"
description: Keeps the stored bill identical to the one printed and handed over, whatever code path the application takes.
tags: [test-cases, billing, append-only]
status: Proposed
origin_repo: bhojnalya
timestamp: 2026-10-14T00:00:00Z
---

# 7. An issued invoice, and everything recorded against it, is never changed or removed

Date: 2026-10-14

## Status

Proposed

## Given

- The application acting in a tenant's context, for an outlet with a
  registered till.

## When

1. It records a ₹105.00 invoice from that till, one line, its tax summary, a
   payment and a cancellation.
2. It tries to change, then to remove, the rows of each of those five kinds.

## Then

- Each record is written and can be read back in that context.
- **Every change and every removal is refused to the application**, for the
  invoice, its lines, its tax summary, its payments and its cancellation. A
  correction is always a new record.

## Procedure

### Setup

`pnpm install` at the repo root on Node 22, with Docker running. The run
starts its own Postgres container with the same roles as `infra/`, and
applies the migrations as the migration owner.

### Run

`pnpm --filter @bhojnalya/db test:int`

### Verify

The `financial tables` suite passes.

## Coverage

- `financial tables › let app_user insert and read every financial record, never change or remove one` (integration)

Command: `pnpm --filter @bhojnalya/db test:int`

## References

- [db 0009](./0009-a-cancelled-invoice-keeps-its-row-and-number-and-its-status-is-derived.md)
- [ADR 0008](../../../../docs/decisions/0008-financial-records-are-append-only.md)
