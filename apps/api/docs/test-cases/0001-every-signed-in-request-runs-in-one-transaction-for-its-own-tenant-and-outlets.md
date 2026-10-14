---
type: Test Case
title: "1. Every signed-in request runs in one transaction for its own tenant and outlets"
description: Protects tenant isolation and all-or-nothing writes for every route, without each handler having to remember them.
tags: [test-cases, multi-tenancy, rls, transactions]
status: Proposed
origin_repo: bhojnalya
timestamp: 2026-10-14T00:00:00Z
---

# 1. Every signed-in request runs in one transaction for its own tenant and outlets

Date: 2026-10-14

## Status

Proposed

## Given

- Two tenants, each with two outlets; a floor belonging to each tenant.

## When

1. A signed-in request reads, as a principal of the first tenant.
2. A signed-in request writes a floor and then fails.
3. A request reaches a tenant route with nobody signed in.

## Then

- **The request runs as the application role, inside one transaction set to the principal's tenant and outlets**, so the database's isolation applies to everything it does.
- It sees its own tenant's floor and not the other tenant's.
- **Everything the failed request wrote is undone.**
- With nobody signed in, the request is refused with 401 `UNAUTHENTICATED` before anything runs: a route is tenant-scoped unless it says it is public.

## Procedure

### Setup

`pnpm install` at the repo root on Node 22, with Docker running. The run
starts its own Postgres container with the same roles as `infra/`, applies the
migrations and installs the job queue as the migration owner, then builds the
real API connected as the application role. A test-only guard stands in for
sign-in and takes the principal from a request header.

### Run

`pnpm --filter @bhojnalya/api test:int`

### Verify

The `TenantTransactionInterceptor` suite passes.

## Coverage

- `TenantTransactionInterceptor › runs the handler as app_user inside a transaction set to the principal's tenant and outlets` (integration)
- `TenantTransactionInterceptor › shows a request its own tenant's rows and none of another tenant's` (integration)
- `TenantTransactionInterceptor › rolls back everything the request wrote when the handler throws` (integration)
- `TenantTransactionInterceptor › refuses a tenant route with 401 UNAUTHENTICATED when no principal was set` (integration)
- Real sign-in setting the principal: **not built** (the auth ticket replaces the test guard).

Command: `pnpm --filter @bhojnalya/api test:int`

## References

- [ADR 0005](../../../../docs/decisions/0005-tenant-isolation-is-enforced-by-the-database.md)
