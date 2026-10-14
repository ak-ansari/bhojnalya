# 14 Super admin: tenants, outlets, floors, tables, QR tokens, impersonation

Status: ready-for-agent
Type: task
Blocked by: 13
Workspaces: apps/api

## What

TRD §5.2 (platform_admin), §10 (QR token), §13 (super admin + impersonation).

## Acceptance

- Separate super-admin login with TOTP 2FA.
- `platform_admin` module is the **only** cross-tenant path; every call writes `audit_log`.
- CRUD for tenant → outlet → floor → table; APIs accept many outlets/floors (invariant 4).
- Table `qr_token`: 128-bit random, base62; `POST /tables/:id/qr/rotate` invalidates the old one.
- Impersonation token with `impersonated_by`; every request made with it is audit-logged.
- Subscription status → outlet `status` (`active`/`suspended`) drives the guard from ticket 08.
- Integration tests: audit row on every platform call, old QR token 404 after rotation, outlet-scoped owner can't see another tenant.
