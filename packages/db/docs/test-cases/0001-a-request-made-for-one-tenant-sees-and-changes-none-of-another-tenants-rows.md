---
type: Test Case
title: "1. A request made for one tenant sees and changes none of another tenant's rows"
description: Protects every café's sales, menus, staff and devices from every other café on the shared database.
tags: [test-cases, multi-tenancy, rls]
status: Proposed
origin_repo: bhojnalya
timestamp: 2026-10-14T00:00:00Z
---

# 1. A request made for one tenant sees and changes none of another tenant's rows

Date: 2026-10-14

## Status

Proposed

## Given

- Two tenants, A and B, each with outlets and a row in every table that
  holds tenant data.
- The application connects as its own role, which cannot bypass isolation
  and owns no table.

## When

1. A request is made in tenant A's context and reads, inserts, updates or
   deletes rows in any tenant table.
2. A request is made with no tenant context at all.

## Then

- **A read in tenant A's context returns none of tenant B's rows, in every
  tenant table**, including tables added after this case was written, which
  are found in the database's own catalogue rather than listed by hand.
- A row written with tenant B's id, or an existing row moved to tenant B, is
  refused. An update or delete aimed at B's rows changes nothing.
- **A request with no context sees no rows at all.** A forgotten context fails
  closed rather than showing everything.
- A tenant sees only its own tenant record.
- Every tenant table has isolation switched on and forced, so it also binds
  the tables' owner.
- A table that has no tenant and is not one of the named platform tables
  fails the run. Platform tables are closed to the application entirely.
- A row cannot point at another tenant's outlet, even when the request's
  context names that outlet.

## Variations

| Operation in A's context | On B's rows | Outcome |
| :-- | :-- | :-- |
| read | any | none returned |
| insert | with B's id | refused |
| update | move A's row to B | refused |
| update / delete | B's rows | 0 rows changed |
| read | no context set | none returned |
| insert | A's id, B's outlet | refused |

## Procedure

### Setup

`pnpm install` at the repo root on Node 22, with Docker running. The run
starts its own Postgres container with the same roles as `infra/`, and
applies the migrations as the migration owner.

### Run

`pnpm --filter @bhojnalya/db test:int`

### Verify

All four suites pass. Then remove one table's isolation from the migration: the suite fails, naming that table.

## Coverage

- `tenant isolation (every tenant table) › connects as a role that can neither bypass RLS nor own a table` (integration)
- `tenant isolation (every tenant table) › finds the tenant tables in the catalogue and leaves no table unclassified` (integration)
- `tenant isolation (every tenant table) › has row-level security enabled and forced on every tenant and platform table` (integration)
- `tenant isolation (every tenant table) › shows no tenant row to a query made without a tenant context` (integration)
- `tenant isolation (every tenant table) › returns none of tenant B's rows to a read under tenant A's context` (integration)
- `tenant isolation (every tenant table) › rejects a write carrying tenant B's id under tenant A's context` (integration)
- `tenant isolation (every tenant table) › shows tenant A only its own tenant row and changes none of tenant B's` (integration)
- `tenant isolation (every tenant table) › denies app_user every platform table, whatever the context` (integration)
- `cross-tenant references › refuses a row of one tenant that points at another tenant's outlet, even when the context names it` (integration)
- `withTenant › runs as app_user, whose reads the context then limits to the tenant` (integration)

Command: `pnpm --filter @bhojnalya/db test:int`

## References

- [db 0002](./0002-a-request-reaches-only-the-outlets-it-was-given.md) (the outlet boundary inside a tenant)
- [db 0003](./0003-a-requests-tenant-lasts-for-its-transaction-and-no-longer.md) (how the context is set)
- [ADR 0005](../../../../docs/decisions/0005-tenant-isolation-is-enforced-by-the-database.md)
- [ADR 0014](../../../../docs/decisions/0014-built-for-chains-shipped-for-cafes.md)
