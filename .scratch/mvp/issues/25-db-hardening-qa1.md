# 25 DB hardening from QA round 1

Status: ready-for-agent
Type: bug
Blocked by: 13
Workspaces: packages/db

QA round 1 on development @ cdcf87a. Probes: `/private/tmp/claude-501/-Users-akansari-projects-bhojnalya/947da6ab-097f-41ff-891f-25d045e1c00f/scratchpad/db/`. Each fix starts with a red test.

1. **Outlet self-unsuspend / sibling edit.** `0001_tenancy_identity.sql` grants `UPDATE` on all of `outlets` and the table only has the tenant-wide policy. As `app_user` with `outlet_ids=[A2]`, A2 suspended: `UPDATE outlets SET status='active', suspended_at=NULL WHERE id=A2` succeeds; with `outlet_ids=[A1]`, `UPDATE outlets SET invoice_prefix='ZZ' WHERE id=A2` succeeds. Expected: `status`, `suspended_at`, `suspension_reason`, `invoice_prefix` writable only by `platform_admin`; other outlet settings writable only for outlets in `app.outlet_ids`. (ADR 0014, 0015, invariant 6.)
2. **Device code reuse.** `UPDATE devices SET device_code='7R'` on a retired device succeeds, then a new device can take `7Q`; `UPDATE devices SET retired_at=NULL` revives a retired device. Expected: `device_code`, `outlet_id`, `tenant_id` immutable; `retired_at` can't change once set. (Invariant 6.)
3. **Self-granted roles on another outlet.** `INSERT INTO user_outlet_roles (outlet_id=A2, role='owner')` as a principal scoped to A1 succeeds. Expected: writes limited to outlets in context (reads may stay tenant-wide for sign-in, ADR 0019).
4. Statement and idle-in-transaction timeouts for `app_user` (QA question; set role-level `statement_timeout` / `idle_in_transaction_session_timeout` in a migration, values in the Answer).

Prefer column-level grants plus a `BEFORE UPDATE` trigger where grants can't express it. New migration numbered after whatever 13 adds. The isolation test must still pass unedited.
