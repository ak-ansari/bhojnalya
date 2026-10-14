---
type: Test Case
title: "13. An aggregator order is stored once, however often it is delivered"
description: Stops a webhook the provider retries from becoming two orders in the kitchen.
tags: [test-cases, aggregators, idempotency]
status: Proposed
origin_repo: bhojnalya
timestamp: 2026-10-14T00:00:00Z
---

# 13. An aggregator order is stored once, however often it is delivered

Date: 2026-10-14

## Status

Proposed

## Given

- An outlet linked to a store at an aggregator provider.

## When

1. An order from that provider is stored under the provider's order id.
2. The same provider order id is stored again.

## Then

- **The second is refused**, so a repeated delivery makes one order.

## Procedure

### Setup

`pnpm install` at the repo root on Node 22, with Docker running. The run
starts its own Postgres container with the same roles as `infra/`, and
applies the migrations as the migration owner.

### Run

`pnpm --filter @bhojnalya/db test:int`

### Verify

The `aggregator_orders` suite passes.

## Coverage

- `aggregator_orders › refuses a second order with the same provider order id, so a repeated webhook makes one order` (integration)
- Turning a stored webhook into an order: **not built**.

Command: `pnpm --filter @bhojnalya/db test:int`

## References

- [db 0004](./0004-a-login-token-or-qr-code-reveals-only-which-tenant-holds-it.md)
- [ADR 0012](../../../../docs/decisions/0012-aggregators-sit-behind-an-adapter.md)
