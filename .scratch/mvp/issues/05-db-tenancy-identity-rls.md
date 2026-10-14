# 05 DB: tenancy + identity schema, app_user role, RLS helper, isolation test

Status: ready-for-agent
Type: task
Blocked by: 01
Workspaces: packages/db

## What

The foundation of invariant 3 (TRD §5.2, §5.3 Tenancy + Identity). Load the `api-code` skill.

## Acceptance

- Drizzle + `drizzle-kit` set up, SQL migrations committed.
- Roles: `app_user` (LOGIN, no BYPASSRLS, not table owner), `platform_admin` (TRD §5.2), migration owner separate.
- Tables: `tenants`, `outlets` (legal name, address, GSTIN, FSSAI, state_code, tax_mode, price_mode, invoice_prefix, KDS thresholds, auto_accept, day_end_cutoff, status), `floors`, `tables` (qr_token), `subscriptions`, `users`, `user_outlet_roles`, `devices` (device_code unique and never reused, role, retired_at, token hash), `refresh_tokens`, `audit_log`.
- A migration helper/SQL function that applies ENABLE + FORCE RLS + the `tenant_isolation` policy, plus `outlet_ids` scoping on outlet-scoped tables.
- `withTenant(db, { tenantId, outletIds }, fn)`: opens a transaction and `set_config(..., true)`.
- **Integration test** (Testcontainers, connected as `app_user`): for **every** table with `tenant_id`, data from tenant B is invisible under tenant A's context and writes with B's id are rejected. The test enumerates tables from `information_schema`, so new tables are covered automatically.
- `pnpm --filter @bhojnalya/db test:int` runs it.
