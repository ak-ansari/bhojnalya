# 13 Auth: owner login, refresh tokens, device registration

Status: resolved
Type: task
Blocked by: 08, 09
Workspaces: apps/api

## What

TRD §13, rows Owner/Manager and POS/KDS device. Load `api-code`.

## Acceptance

- Email/phone + password login (Argon2id); JWT access 15 min; rotating refresh in httpOnly SameSite cookie with reuse detection.
- Email OTP password reset behind an interface (console transport in dev; no paid provider).
- `POST /devices` (owner-authenticated) registers a POS/KDS device for an outlet: assigns a fresh 2-char base36 `device_code` never reused in that outlet, returns a long-lived device token (stored hashed).
- Re-provisioning retires the old code and records its last synced invoice number (TRD §7).
- `DELETE /devices/:id` revokes; revoked tokens get 401.
- Guards put `tenantId`/`outletIds`/`deviceId` on the request for the tenant interceptor.
- `user_outlet_roles` used; MVP role is `owner` only.
- Integration tests: login, refresh rotation + reuse, device code uniqueness under concurrency, revoked device rejected.

## Comments

- **Outside my workspaces, please do at merge:** set `AUTH_TOKEN_SECRET`
  (32+ chars) for the `api` service in `infra/docker-compose.yml` and
  `infra/.env.example`. Without it the API signs with a per-process secret
  and logs a warning in production: access tokens die at each restart and
  clients refresh, and open reset codes stop verifying.
- **Mail:** there is no production mail transport (no paid provider). In
  production a reset request is accepted and the email is dropped with a
  warning. A free SMTP transport is a later ticket.
- **Seen while testing:** lines logged through Nest's `Logger` (e.g. the
  error envelope filter's 500 log, or `AuthService`'s mail-failure log) did
  not reach the pino destination in integration tests, nor stdout. The
  "never logs a secret" tests therefore guard the pino-http request lines,
  which is where a body would leak. Worth a look in ticket 08's area.
- **Not built:** rate limiting on login and reset requests; a grace period
  for concurrent refreshes (ADR 0027 accepts the trade-off); throttled
  `last_seen_at` is updated at most every 5 min by the guard.
- `@bhojnalya/contracts` now exports `AccessClaims`. The admin's local copy
  (ticket 12) can switch to it; note `scope` is now required and is
  `'tenant'` (ticket 14 adds `'platform'`).

## Answer

Owner sign-in, rotating refresh tokens, email-code password reset, device
registration, re-provisioning and revocation, and the real auth guard, in
`apps/api`. Additive schemas in `packages/contracts`; migration
`0004_password_reset_codes` in `packages/db`.

**What's there**

- `platform/auth/`: `AuthGuard` (an `APP_GUARD`) sets `req.principal`;
  `AccessTokens` (HS256 JWT via `jose`, 15 min, claims `sub`, `scope:'tenant'`,
  `tenant_id`); `permissions.ts` (`Permission` enum, `ROLE_PERMISSIONS`, MVP
  `owner` = all, staff roles empty; `can(principal, permission, outletId?)`);
  decorators `@RequirePermission(p)`, `@DeviceOnly()`, `@CurrentPrincipal()`;
  opaque secrets `bdt_…` (device) and `brt_…` (refresh), 256 bits, stored as
  SHA-256. `platform/clock.ts` (`CLOCK`) and `platform/mail/mail-transport.ts`
  (`MAIL_TRANSPORT`; console to stderr in dev, dropped with a warning in prod).
  `createApp({ auth: { clock, mailTransport } })` swaps them in tests.
- `modules/auth`: `POST /auth/login` (email any case or phone + password,
  Argon2id via `@node-rs/argon2`, 19 MiB/t=2/p=1; unknown login, wrong
  password and disabled account all 401 `INVALID_CREDENTIALS`, with a dummy
  verify), `POST /auth/refresh` (rotation; a reused token revokes its family),
  `POST /auth/logout`, `POST /auth/password-reset/request` (always 202, six
  digits, HMAC-keyed hash, 10 min, newer code spends older) and
  `/confirm` (5 wrong guesses spend the code; success revokes all refresh
  tokens). Refresh cookie `bhojnalya_rt`: HttpOnly, Secure, SameSite=Strict,
  Path `/api/v1/auth`, 30 days.
- `modules/devices`: `POST /devices` (owner, `devices.manage`; body
  `{ id: uuidv7, outletId, role, name?, replacesDeviceId? }`) locks the
  outlet row (`FOR NO KEY UPDATE`) and takes the lowest unused base36 code
  from `01` to `ZZ`; 409 `DEVICE_CODES_EXHAUSTED` when none remain. Returns
  `{ device, deviceToken, invoicePrefix }`. With `replacesDeviceId` the old
  device is retired in the same transaction: `retired_at`, `revoked_at`,
  `replaced_by_device_id`, and `retired_last_invoice_no` from the latest FY
  in `device_invoice_counters`. `GET /devices?outletId&cursor&limit`
  (cursor = device code), `GET /devices/me` (device only),
  `DELETE /devices/:id` (sets `revoked_at`, 204, idempotent). Register,
  retire and revoke write `audit_log`.
- `packages/contracts`: `auth.ts` (`LoginRequest`, `AuthSession`,
  `PasswordResetRequest/Confirm`, `NewPassword`, `AccessClaims`, `DeviceCode`,
  `RegisterDeviceRequest`, `Device`, `RegisteredDevice`, `DeviceListQuery`,
  `DeviceList`, `CurrentDevice`), `OutletRole` enum, and error codes
  `INVALID_CREDENTIALS`, `INVALID_RESET_CODE`, `DEVICE_CODES_EXHAUSTED`.
- `packages/db`: `password_reset_codes` (tenant-wide RLS; app_user S/I/U,
  platform_admin S). No new pre-sign-in lookup: reset uses `resolveLogin`.
- Tests: API unit 26 (4 new files), API integration 37 new (auth 21,
  devices 16, including 20 parallel registrations getting 20 distinct codes),
  contracts 5 new, db enum row for `outlet_role`. Every new test was seen
  red by breaking the code in batches (no row lock, no family revoke,
  revoked device accepted, password not verified, wrong FY order, cookie not
  Secure, acting outlet not narrowed, secret answer stored for replay, TTLs
  and attempt limit changed, code allocation from `00`, Argon2 memory,
  permission and reach checks removed, body logged by pino-http, signature
  not verified, schema loosening in contracts). Cases `api 0009`–`0014`,
  `contracts 0007`; `contracts 0006` and `db 0014` gained a row.

**Decisions**

- **ADR 0027 (Proposed):** the access token names only user and tenant; the
  guard reads account status and `user_outlet_roles` (and the device's
  revoked/retired state) on every request, so revocation and role changes are
  immediate, at one short extra transaction per request. `X-Outlet-Id` names
  the acting outlet and narrows `outletIds` to it; a one-outlet owner acts
  for it implicitly; an owner of several who names none acts for none (so
  the suspension check does not run for them). A response holding a device
  token is never stored by the idempotency interceptor
  (`@ResponseHoldsSecret()`); the client-made device id makes a retry 409.
  A reused refresh token ends the family with no grace period.
- Device codes start at `01` (1,295 per outlet). Revoke only revokes; a
  device is retired (and its last invoice number recorded) when it is
  replaced, and a revoked device may still be replaced.
- `AUTH_TOKEN_SECRET` is optional (see Comments) so compose keeps starting.

**Notes for later tickets**

- **Principal shape** (`platform/http/api-request.ts`):
  `{ tenantId, outletIds, outletId?, deviceId?, userId?, roles? }`. A device:
  `outletIds = [outletId]`, `deviceId` set, `roles: []`. A person: `userId`,
  `roles: [{ outletId, role }]`.
- **Protect a route:** every non-`@Public()` route already needs a principal
  (401). Add `@RequirePermission('menu.manage')` for owner routes, or
  `@DeviceOnly()` for till/KDS routes. For a route that targets an outlet
  named in the body or path, also check `can(principal, permission, outletId)`.
- **Get the device in a handler:** `@CurrentPrincipal() p: Principal` then
  `p.deviceId` / `p.outletId`; the tenant transaction is `@TenantTx()`.
- **14 (platform admin):** add `scope: 'platform'` tokens in `AccessTokens`
  and a branch in `AuthGuard.principalFor`; `impersonated_by` is already in
  `AccessClaims`.
- **15 (menu):** `@RequirePermission('menu.manage')`; menu changes act for
  `principal.outletId`.
- **17 (sync):** `@DeviceOnly()` + `@AllowWhenSuspended()` on
  `POST /sync/push`. A revoked device gets 401 on push, so unsynced invoices
  on a revoked till cannot reach the server; decide whether revoked (not
  retired) devices may still push.
- **23 (owner portal):** devices screen uses `GET /devices?outletId=`,
  `POST /devices` (register on the device itself, store `deviceToken`),
  `DELETE /devices/:id`; send `X-Outlet-Id` for the outlet being managed;
  the access token is in the body, refresh is cookie-only (`credentials:
  'include'` against `/api/v1/auth/refresh`).

**Proposed `docs/log.md` entry**

```markdown
## 2026-10-16 — owners sign in and tills are registered

- **Creation**: `apps/api` sign-in (Argon2id, 15-minute access token,
  rotating refresh cookie with reuse detection), email-code password reset,
  device registration with a never-reused per-outlet code, re-provisioning
  that records the last synced invoice number, revocation, and the auth guard
  that sets the request principal (ticket 13). Cases `api 0009`–`0014`,
  `contracts 0007`. `packages/db` migration `0004_password_reset_codes`.
  ADR 0027: who a request acts for is read fresh on every request.
```
