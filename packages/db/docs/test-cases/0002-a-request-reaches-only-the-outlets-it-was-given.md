---
type: Test Case
title: "2. A request reaches only the outlets it was given"
description: Protects one outlet of a chain from staff and devices of another outlet of the same tenant.
tags: [test-cases, multi-tenancy, rls, outlets]
status: Proposed
origin_repo: bhojnalya
timestamp: 2026-10-14T00:00:00Z
---

# 2. A request reaches only the outlets it was given

Date: 2026-10-14

## Status

Proposed

## Given

- One tenant with two outlets, A1 and A2, and a row for each outlet in every
  outlet-scoped table.
- Tenant-wide tables are named: user roles (read at sign-in, before the
  outlets are known) and the audit log. Every other table with an outlet is
  outlet-scoped.

## When

1. A request is made for the tenant with only outlet A1 in its context.

## Then

- **None of outlet A2's rows are visible, in every outlet-scoped table**, and
  outlet A1's own rows are.
- A row written for outlet A2 is refused.

## Procedure

### Setup

`pnpm install` at the repo root on Node 22, with Docker running. The run
starts its own Postgres container with the same roles as `infra/`, and
applies the migrations as the migration owner.

### Run

`pnpm --filter @bhojnalya/db test:int`

### Verify

The outlet suite passes. Remove the outlet scoping from one table's migration: the suite fails, naming that table.

## Coverage

- `tenant isolation (every tenant table) › hides outlet A2's rows from, and refuses them to, a context holding only outlet A1` (integration)

Command: `pnpm --filter @bhojnalya/db test:int`

## References

- [db 0001](./0001-a-request-made-for-one-tenant-sees-and-changes-none-of-another-tenants-rows.md)
- [ADR 0014](../../../../docs/decisions/0014-built-for-chains-shipped-for-cafes.md)
