---
type: Test Case
title: "3. A request's tenant lasts for its transaction and no longer"
description: Protects pooled connections from carrying one request's tenant into the next request.
tags: [test-cases, multi-tenancy, rls, transactions]
status: Proposed
origin_repo: bhojnalya
timestamp: 2026-10-14T00:00:00Z
---

# 3. A request's tenant lasts for its transaction and no longer

Date: 2026-10-14

## Status

Proposed

## Given

- A tenant with an outlet and a floor, and a connection pool of one, so every request reuses the same connection.

## When

1. Work runs in a tenant context and finishes.
2. Work runs in a tenant context and fails part-way.
3. A context is asked for with an id that is not a UUID, or an outlet list
   with two ids packed into one entry.

## Then

- **Inside the work, the tenant and its outlets are set; after it, on the same
  connection, neither is.**
- What finished work wrote is kept. **Everything failed work wrote is undone.**
- A malformed tenant or outlet id is refused before any transaction opens.

## Procedure

### Setup

`pnpm install` at the repo root on Node 22, with Docker running. The run
starts its own Postgres container with the same roles as `infra/`, and
applies the migrations as the migration owner.

### Run

`pnpm --filter @bhojnalya/db test:int`

### Verify

The `withTenant` suites pass in both `test` and `test:int`.

## Coverage

- `withTenant › sets the tenant and outlets for its transaction and for nothing after it` (integration)
- `withTenant › commits what the callback writes, and rolls all of it back when the callback throws` (integration)
- `withTenant › refuses a tenant id that is not a UUID before opening a transaction` (unit)
- `withTenant › refuses an outlet id that could smuggle a second id into the list` (unit)

Commands: `pnpm --filter @bhojnalya/db test:int` (integration) and
`pnpm --filter @bhojnalya/db test` (unit)

## References

- [db 0001](./0001-a-request-made-for-one-tenant-sees-and-changes-none-of-another-tenants-rows.md)
- [ADR 0005](../../../../docs/decisions/0005-tenant-isolation-is-enforced-by-the-database.md)
