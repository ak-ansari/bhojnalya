---
type: Decision
title: Tenant isolation is enforced by the database
description: Every tenant's rows sit in shared tables guarded by row-level security that the application cannot bypass; cross-tenant access goes through one separately-privileged, audited path.
tags: [adr, multi-tenancy, security, database]
timestamp: 2026-10-14T00:00:00Z
---

# 5. Tenant isolation is enforced by the database

Date: 2026-10-14

## Status

Accepted

## Context

N4 requires strict isolation between tenants, enforced at the data layer. One
café seeing another's sales, menu or customers is the failure that ends a
multi-tenant product. The usual way it happens is not an attack. It is a query
that forgot its tenant filter: a new report, a background job, a hand-written
join.

There were three options:

- **A database or schema per tenant.** Isolation is strong, but every
  migration runs once per tenant, connection counts grow with tenants, and the
  cost and operations burden do not fit a single small server
  ([ADR 0011](0011-one-process-and-one-database-until-a-scale-trigger.md)).
- **Shared tables, filtered in application code.** Cheap, but correct only
  while every query remembers. That is exactly the promise that breaks.
- **Shared tables with row-level security in the database.** Cheap, and the
  filter applies to every query, including ones written later.

## Decision

Tenants share tables. Every tenant-owned row carries its tenant, and every
outlet-scoped row also carries its outlet
([ADR 0014](0014-built-for-chains-shipped-for-cafes.md)).

The application connects as a role that **cannot bypass row-level security**
and does not own the tables. Every tenant table has the same isolation policy,
and the policy applies to the owner as well. Every request runs inside a
transaction that first sets the tenant, and the outlets the caller may reach,
as settings scoped to that transaction. The policy reads them. A query that
runs without them sees nothing.

Cross-tenant access, which the platform's own support needs (S6), uses a
**separate, privileged role through one dedicated module**. Every use is
written to the audit log. No other code path holds that privilege.

An automated test runs for **every tenant table**: a read made in one tenant's
context returns none of another tenant's rows. A new table without the policy
fails the build.

## Consequences

A forgotten filter returns no rows instead of another tenant's rows. Mistakes
fail closed, which is the right direction for this product.

Isolation costs nothing extra in infrastructure and survives a move to a
managed database unchanged.

Every request pays for a transaction and two setting calls. Work that runs
outside a request, such as background jobs, socket handlers and sync batches,
has to set the same context explicitly. Each of those is a place where a
missing context shows up as "no data" and can look like a different bug.

Policies cannot be seen from application code. A developer reading a query
does not see the filter that will apply to it. That is why the per-table test
exists, and why it must cover every table rather than a sample.

The privileged path is a single point of trust. Its audit trail is only as
good as the discipline of never adding a second one.
