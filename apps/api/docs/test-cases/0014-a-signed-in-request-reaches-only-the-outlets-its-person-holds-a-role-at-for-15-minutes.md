---
type: Test Case
title: "14. A signed-in request reaches only the outlets its person holds a role at, for 15 minutes"
description: Makes an access token a short-lived proof of who signed in, while what it may reach is decided by the database on every request.
tags: [test-cases, auth, tenancy]
status: Proposed
origin_repo: bhojnalya
timestamp: 2026-10-14T00:00:00Z
---

# 14. A signed-in request reaches only the outlets its person holds a role at, for 15 minutes

Date: 2026-10-14

## Status

Proposed

## Given

- An owner of both outlets of a tenant, signed in as in [api 0009](./0009-an-owner-signs-in-with-an-email-or-phone-and-a-password-and-a-failed-sign-in-reveals-nothing.md),
  and another tenant.

## When

1. A request is made with the access token just before, and at, 15 minutes
   after it was issued.
2. The account is disabled and the token is used again.
3. Requests name no outlet, one of the owner's outlets, and the other
   tenant's outlet.
4. A well-formed token for the owner, signed with a different secret, is used.

## Then

- **The access token works until 15 minutes after it was issued and is refused
  with 401 from then on.** It carries the user, the tenant and a `tenant`
  scope, and nothing about outlets or roles.
- **A disabled account's token is refused on its next request.**
- With no outlet named, the request reaches every outlet the owner holds a
  role at; naming one narrows it to that outlet; naming one they hold no role
  at gets 403 `FORBIDDEN`.
- A token not signed by this server, a tampered one, or one with no algorithm
  is refused.
- Permissions follow the role at the outlet: the owner holds them all; staff
  roles hold none yet; a device holds none; an outlet outside the request's
  reach is refused even where the role is held.

## Procedure

### Setup

As in [api 0009](./0009-an-owner-signs-in-with-an-email-or-phone-and-a-password-and-a-failed-sign-in-reveals-nothing.md);
the test replaces the clock.

### Run

`pnpm --filter @bhojnalya/api test:int` and `pnpm --filter @bhojnalya/api test`

### Verify

The `access tokens`, `AccessTokens`, `can` and `userPrincipal` suites pass.

## Coverage

- `access tokens › stop working 15 minutes after they are issued` (integration)
- `access tokens › stop working on the next request once the account is disabled` (integration)
- `access tokens › reach only the outlet named in X-Outlet-Id, and refuse one that is not the user's` (integration)
- `access tokens › refuse a well-formed token for a real owner that this API did not sign` (integration)
- `AccessTokens › issues a token that expires 15 minutes after it is issued` (unit)
- `AccessTokens › names the user and tenant with a tenant scope, and nothing about outlets` (unit)
- `AccessTokens › is accepted up to its expiry and refused from then on` (unit)
- `AccessTokens › refuses a token signed with another secret, a tampered one, or one with no algorithm` (unit)
- `AccessTokens › refuses a token from this secret whose claims are not ours` (unit)
- `can › lets an owner do everything at an outlet they own` (unit)
- `can › refuses an outlet the principal holds no role at, and every Phase 2 role for now` (unit)
- `can › refuses a device, which holds no roles` (unit)
- `can › refuses an outlet outside the reach of this request even where the role is held` (unit)
- `userPrincipal › acts for the only outlet of a one-outlet owner without being told` (unit)
- `userPrincipal › acts for no outlet but reaches all of them when an owner of several names none` (unit)
- `userPrincipal › reaches only the named outlet when one is named` (unit)
- `userPrincipal › refuses an outlet the user holds no role at` (unit)
- A change by an owner of several outlets who names none is not checked
  against suspension: see ADR 0027. Staff roles' permissions: **not built**.

Command: `pnpm --filter @bhojnalya/api test:int`

## References

- [api 0001](./0001-every-signed-in-request-runs-in-one-transaction-for-its-own-tenant-and-outlets.md)
- [api 0004](./0004-a-suspended-outlets-changes-are-refused-but-its-reads-and-record-keeping-are-not.md)
- [ADR 0027](../../../../docs/decisions/0027-who-a-request-acts-for-is-read-fresh-on-every-request.md)
