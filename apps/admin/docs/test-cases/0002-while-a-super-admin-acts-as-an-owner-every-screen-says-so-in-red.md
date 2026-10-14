---
type: Test Case
title: "2. While a super admin acts as an owner, every screen says so in red"
description: Protects owners and support staff from changes made on an owner's behalf without anyone noticing.
tags: [test-cases, impersonation, session]
status: Accepted
origin_repo: bhojnalya
timestamp: 2026-10-14T00:00:00Z
---

# 2. While a super admin acts as an owner, every screen says so in red

Date: 2026-10-14

## Status

Accepted

## Given

- A session whose access token names the super admin acting on the owner's
  behalf (a view-as token), or a session whose token names no one, or no
  session at all.

## When

1. Any owner or platform screen is opened.
2. The super admin chooses to exit view-as.

## Then

- **With a view-as token, every screen shows a red banner** saying the
  person is viewing as the owner and that everything they do is written to
  the audit log as them, on the owner's behalf. The banner comes from the
  token alone, so no screen can forget it.
- An owner signed in as themselves, or a visitor with no token, sees no
  banner.
- Exiting view-as drops the view-as token and returns to the platform's
  outlet list, and the banner is gone.
- A token the admin cannot read, or one with no subject, counts as no
  session; it never shows or hides the banner by accident.
- The banner is display only: the server, not the admin, verifies the token
  and writes the audit log.
- Ending the view-as on the server: **not built** (exiting only drops the
  token held in the browser).

## Procedure

### Setup

`pnpm install` at the repo root on Node 22.

### Run

`pnpm --filter @bhojnalya/admin test`

### Verify

The `ImpersonationBanner`, `decodeAccessClaims` and `isImpersonating` suites
pass.

## Coverage

- `ImpersonationBanner › shows the red view-as banner on /owner/dashboard while the token names an impersonator` (component), and the same for `/owner/menu`, `/owner/reports`, `/platform/outlets`
- `ImpersonationBanner › shows no banner to an owner signed in as themselves` (component)
- `ImpersonationBanner › shows no banner without a token` (component)
- `ImpersonationBanner › drops the view-as token and returns to the platform console on exit` (component)
- `decodeAccessClaims › reads the claims from the payload of a signed token` (unit)
- `decodeAccessClaims › reads a payload that uses the URL-safe base64 alphabet and non-ASCII text` (unit)
- `decodeAccessClaims › gives no claims for a missing, malformed or foreign token` (unit)
- `isImpersonating › is true only when the token names who is acting on the owner’s behalf` (unit)
- A view-as token issued by the real API: **GAP** (no sign-in or view-as endpoint yet; contract test to come).

Command: `pnpm --filter @bhojnalya/admin test`

## References

- [ADR 0005 Tenant isolation is enforced by the database](../../../../docs/decisions/0005-tenant-isolation-is-enforced-by-the-database.md)
