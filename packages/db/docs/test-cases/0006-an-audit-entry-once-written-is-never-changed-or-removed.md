---
type: Test Case
title: "6. An audit entry, once written, is never changed or removed"
description: Protects the record of who did what, including every super admin action on a tenant.
tags: [test-cases, identity, audit]
status: Proposed
origin_repo: bhojnalya
timestamp: 2026-10-14T00:00:00Z
---

# 6. An audit entry, once written, is never changed or removed

Date: 2026-10-14

## Status

Proposed

## Given

- The application acting in a tenant's context.

## When

1. It writes an audit entry.
2. It tries to change or remove audit entries.

## Then

- The entry is written and can be read back in that tenant's context.
- **Changing or removing an entry is refused to the application.**

## Procedure

### Setup

`pnpm install` at the repo root on Node 22, with Docker running. The run
starts its own Postgres container with the same roles as `infra/`, and
applies the migrations as the migration owner.

### Run

`pnpm --filter @bhojnalya/db test:int`

### Verify

The `audit_log` suite passes.

## Coverage

- `audit_log › lets app_user insert and read, never change or remove` (integration)
- An audit entry for every privileged cross-tenant call: **not built**.

Command: `pnpm --filter @bhojnalya/db test:int`

## References

- [ADR 0005](../../../../docs/decisions/0005-tenant-isolation-is-enforced-by-the-database.md)
