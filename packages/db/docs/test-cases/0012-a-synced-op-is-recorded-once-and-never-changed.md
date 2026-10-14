---
type: Test Case
title: "12. A synced op is recorded once and never changed"
description: Gives sync its idempotency: a replayed op is recognised by its id, and a till's sequence cannot hold two ops at one position.
tags: [test-cases, sync, idempotency]
status: Proposed
origin_repo: bhojnalya
timestamp: 2026-10-14T00:00:00Z
---

# 12. A synced op is recorded once and never changed

Date: 2026-10-14

## Status

Proposed

## Given

- An outlet with a registered till.

## When

1. An op from the till is recorded at sequence 1.
2. The same op id is recorded again at sequence 2.
3. A new op id is recorded at sequence 1.
4. The application tries to change, then remove, recorded ops.

## Then

- **A second record with the same op id is refused**, so a replayed op is
  never applied twice.
- A second op at the same position in the till's sequence is refused.
- Recorded ops cannot be changed or removed by the application.

## Procedure

### Setup

`pnpm install` at the repo root on Node 22, with Docker running. The run
starts its own Postgres container with the same roles as `infra/`, and
applies the migrations as the migration owner.

### Run

`pnpm --filter @bhojnalya/db test:int`

### Verify

The `sync_ops` suite passes.

## Coverage

- `sync_ops › records an op once: a replayed op id or a repeated device sequence is refused, and nothing is changed or removed` (integration)
- Acking a replayed op without applying it, and applying a batch in sequence
  order: **not built**.

Command: `pnpm --filter @bhojnalya/db test:int`

## References

- [ADR 0006](../../../../docs/decisions/0006-the-till-is-local-first-the-kitchen-and-guests-are-online.md)
- [ADR 0009](../../../../docs/decisions/0009-ids-are-made-by-the-client.md)
