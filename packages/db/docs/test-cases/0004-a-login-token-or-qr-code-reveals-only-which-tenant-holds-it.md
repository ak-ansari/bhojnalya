---
type: Test Case
title: "4. A login, token or QR code reveals only which tenant holds it"
description: Lets sign-in, devices, token refresh and guests find their tenant without opening a general way across tenants.
tags: [test-cases, multi-tenancy, rls, auth]
status: Proposed
origin_repo: bhojnalya
timestamp: 2026-10-14T00:00:00Z
---

# 4. A login, token or QR code reveals only which tenant holds it

Date: 2026-10-14

## Status

Proposed

## Given

- Two tenants. The second has an owner with an email and a phone, a
  registered till with a token, a refresh token, a table with a QR code, and
  in its second outlet a link to an aggregator's store.
- No tenant context is set.

## When

1. The owner's email (in any case) or phone is looked up.
2. The till's token, the refresh token, the table's QR code or the
   aggregator's provider and store id is looked up.
3. The application switches the lookup behaviour on for itself and reads the
   same tables directly.

## Then

- **Each lookup returns only the ids needed to open the tenant's context**:
  the tenant, and the outlet and the row's own id where they apply. An
  unknown login or secret returns nothing.
- **The application cannot widen a lookup into a read**: switching the lookup
  behaviour on itself shows no rows, and it may neither create nor loosen
  isolation rules.
- After a lookup returns, nothing of it is left switched on.

## Variations

| Looked up by | Returns |
| :-- | :-- |
| email, any case, or phone | tenant, user |
| device token | tenant, outlet, device |
| refresh token | tenant, user, token |
| table QR code | tenant, outlet, table |
| aggregator provider and store id | tenant, outlet, link |
| a known store id under another provider | nothing |
| anything unknown | nothing |

## Procedure

### Setup

`pnpm install` at the repo root on Node 22, with Docker running. The run
starts its own Postgres container with the same roles as `infra/`, and
applies the migrations as the migration owner.

### Run

`pnpm --filter @bhojnalya/db test:int`

### Verify

The `pre-auth resolvers` suite passes.

## Coverage

- `pre-auth resolvers › finds the tenant of a login by email in any case, or by phone, with no context set` (integration)
- `pre-auth resolvers › finds the tenant and outlet of a device token hash` (integration)
- `pre-auth resolvers › finds the tenant and user of a refresh token hash` (integration)
- `pre-auth resolvers › finds the tenant, outlet and table of a QR token` (integration)
- `pre-auth resolvers › finds the tenant, outlet and link of an aggregator's store id` (integration)
- `pre-auth resolvers › leaves app_user unable to read across tenants by switching the lookup setting on itself` (integration)
- `pre-auth resolvers › leaves no lookup switched on after a resolver returns` (integration)
- `pre-auth resolvers › denies app_user the helpers that create or loosen policies` (integration)
- Sign-in, device authentication, refresh, QR scan and aggregator webhooks using these lookups: **not built**.

Command: `pnpm --filter @bhojnalya/db test:int`

## References

- [db 0001](./0001-a-request-made-for-one-tenant-sees-and-changes-none-of-another-tenants-rows.md)
- [ADR 0019](../../../../docs/decisions/0019-a-caller-without-a-tenant-may-learn-only-which-tenant-holds-its-secret.md)
- [ADR 0021](../../../../docs/decisions/0021-an-aggregator-webhook-may-learn-only-which-outlet-its-store-belongs-to.md)
- [ADR 0005](../../../../docs/decisions/0005-tenant-isolation-is-enforced-by-the-database.md)
