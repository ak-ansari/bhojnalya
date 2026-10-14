# 05 DB: tenancy + identity schema, app_user role, RLS helper, isolation test

Status: resolved
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

## Comments

- **Outside `packages/db`:** `pnpm-lock.yaml` (new dependencies), ADR 0019 and
  its line in `docs/decisions/index.md`. The integration setup *reads*
  `infra/postgres/init/01-roles.sh` and runs it in the Testcontainers
  Postgres, so tests and dev create the roles from the same script. `infra/`
  is unchanged and needs no change.
- **Not edited, please do at merge:** add a row for
  `packages/db/docs/test-cases/` (`db 0001`) to the catalogue table in
  `docs/test-cases/index.md`, and the `docs/log.md` entry below.
  `CLAUDE.md` can now list `pnpm --filter @bhojnalya/db test:int`.
- **For 08 (idempotency_keys):** create the table with drizzle-kit
  (`pnpm --filter @bhojnalya/db db:generate`), then append to the end of that
  same migration `SELECT app.enable_tenant_rls('idempotency_keys'[, 'outlet_id']);`
  and explicit `GRANT`s. There are no default privileges, so a table without a
  grant is closed to `app_user`.
- **For 09:** the isolation test covers new tables with no edits. It seeds
  every required column from its type: digits for `char(n)`, unique text, the
  first enum label, and so on. A CHECK constraint that rejects those values
  fails the run loudly, naming the table and asking for `syntheticValue` to be
  taught. Append-only means granting `app_user` only `SELECT, INSERT`.
  A new table with an `outlet_id` is expected to be outlet-scoped unless it
  is added to `TENANT_WIDE_WITH_OUTLET` in the test.
- **For 13 / 14:** sign-in, device tokens, refresh tokens and QR scans call
  `resolveLogin` / `resolveDeviceToken` / `resolveRefreshToken` /
  `resolveQrToken` first, then `withTenant` (ADR 0019). An email or phone is
  unique across the platform. `app_user` cannot insert tenants, outlets or
  subscriptions; those go through `platform_admin`. The super admins'
  table `platform_admins` exists and only `platform_admin` can see it.

## Answer

Tenancy and identity schema, RLS helper, `withTenant`, pre-auth resolvers and
an isolation test driven by the catalogue, all in `packages/db`.

**What's there**

- Drizzle 0.45 + drizzle-kit 0.31, node-postgres. Migrations are committed in
  `packages/db/migrations/`. `0000_rls_helpers` (hand-written) adds schema
  `app` with `app.tenant_id()`, `app.outlet_ids()`,
  `app.enable_tenant_rls(table, outlet_column?, tenant_column?)` (ENABLE +
  FORCE + `tenant_isolation`, plus a RESTRICTIVE `outlet_isolation` when an
  outlet column is given) and `app.allow_pre_auth_lookup(table)`.
  `0001_tenancy_identity` is generated, with RLS, grants and resolvers
  appended in the same file.
- Tables: `tenants`, `outlets`, `floors`, `tables`, `subscriptions`, `users`,
  `user_outlet_roles`, `devices`, `refresh_tokens`, `audit_log`,
  `platform_admins`. Children reference parents by `(tenant_id, id)`, so a
  foreign key cannot cross tenants. A foreign-key check ignores RLS, so this
  needs the composite key.
- Roles are ticket 06's: migrations run as `bhojnalya_owner` (bound by
  FORCE), `app_user` and `platform_admin` get explicit per-table grants.
- Public API: `withTenant`, `TenantContext`, `createDb`, `Db`, `Tx`,
  `Schema`, `runMigrations`, `MIGRATIONS_FOLDER`, `resolveLogin`,
  `resolveDeviceToken`, `resolveRefreshToken`, `resolveQrToken`, every
  table/enum, and `schema`.
- Tests: 25 integration tests (Testcontainers `postgres:16.10-alpine`, roles
  from the infra script, all assertions as `app_user`) and 2 unit tests. Cases
  `db 0001`–`0006` are in `packages/db/docs/test-cases/`. Every test was
  seen red: removing the devices policy, removing the floors outlet scoping
  and adding an unprotected `widgets` table each fail the isolation suite and
  name the table. Each of the other tests was broken on purpose too.

**Decisions**

- **ADR 0019 (Proposed):** before sign-in, a fixed set of SECURITY DEFINER
  lookups returns only ids. They work through an owner-only `pre_auth_lookup`
  policy that a setting switches on. The setting is useless to `app_user`
  because the check also requires `current_user = 'bhojnalya_owner'`. This
  is an exception ADR 0005 did not foresee; the reviewer may prefer to call it
  a supersession.
- A missing context fails closed (`current_setting(..., true)` → NULL → no
  rows) rather than raising an error, as ADR 0005 says.
- Tenant-wide despite having an `outlet_id`: `user_outlet_roles` (read at
  sign-in before outlets are known) and `audit_log` (nullable outlet).
  `outlets` is tenant-scoped, so an owner can list their outlets.
- Devices: `UNIQUE (outlet_id, device_code)`, and `app_user` has no DELETE,
  so a retired code stays taken. `audit_log` is insert/select only.
- `UNIQUE (tenant_id, invoice_prefix)` on outlets: two outlets can share one
  GSTIN, so their series must differ.
- `outlets.status` + `suspended_at` + `suspension_reason` (ADR 0015).
  `subscriptions` is one per outlet with trial/active/overdue/suspended (PRD S3).

**Proposed `docs/log.md` entry** (one heading, in the file's format)

```markdown
## 2026-10-14 — every tenant table is isolated by the database

- **Creation**: `packages/db` tenancy and identity schema, migrations, the
  `app.enable_tenant_rls` helper, `withTenant` and the pre-sign-in lookups
  (ADR 0019). Test cases `db 0001`–`0006`; the isolation test finds tenant
  tables in the catalogue, so new tables are covered without edits.
```
