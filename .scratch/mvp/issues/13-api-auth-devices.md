# 13 Auth: owner login, refresh tokens, device registration

Status: ready-for-agent
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
