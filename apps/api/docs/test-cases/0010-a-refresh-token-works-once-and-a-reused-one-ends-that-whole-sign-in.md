---
type: Test Case
title: "10. A refresh token works once, and a reused one ends that whole sign-in"
description: Keeps an owner signed in without a long-lived bearer, and makes a stolen refresh token useless as soon as either party uses it twice.
tags: [test-cases, auth]
status: Proposed
origin_repo: bhojnalya
timestamp: 2026-10-14T00:00:00Z
---

# 10. A refresh token works once, and a reused one ends that whole sign-in

Date: 2026-10-14

## Status

Proposed

## Given

- An owner signed in as in [api 0009](./0009-an-owner-signs-in-with-an-email-or-phone-and-a-password-and-a-failed-sign-in-reveals-nothing.md),
  holding a refresh cookie.

## When

1. They refresh.
2. The first refresh token is presented again.
3. The owner signs in a second time elsewhere and one sign-in is ended by a reuse.
4. A refresh token expires; a request carries none; a request carries one the
   server never issued.
5. The owner signs out.

## Then

- **A refresh replaces the cookie with a new token and returns a new access
  token**; the new refresh token works in turn.
- **Presenting a used refresh token again gets 401 `UNAUTHENTICATED` and
  revokes every token descended from that sign-in**, including the newer one
  the legitimate holder has.
- Another sign-in of the same owner keeps working.
- An expired, missing or unknown refresh token gets 401 and the cookie is cleared.
- Signing out revokes the sign-in; its refresh token no longer works.

## Procedure

### Setup

As in [api 0009](./0009-an-owner-signs-in-with-an-email-or-phone-and-a-password-and-a-failed-sign-in-reveals-nothing.md).

### Run

`pnpm --filter @bhojnalya/api test:int`

### Verify

The `POST /auth/refresh` and `POST /auth/logout` suites pass.

## Coverage

- `POST /auth/refresh › replaces the refresh token with a new one and issues a new access token` (integration)
- `POST /auth/refresh › treats a used refresh token presented again as theft: 401, and the whole family is revoked` (integration)
- `POST /auth/refresh › leaves other sign-ins of the same user alone when one family is revoked` (integration)
- `POST /auth/refresh › refuses an expired refresh token, a missing one and a made-up one, clearing the cookie` (integration)
- `POST /auth/logout › revokes the refresh token so it cannot be refreshed again` (integration)
- Two refreshes racing with the same token: they are serialised by a row
  lock, so the second counts as a reuse; no test races them.

Command: `pnpm --filter @bhojnalya/api test:int`

## References

- [ADR 0027](../../../../docs/decisions/0027-who-a-request-acts-for-is-read-fresh-on-every-request.md)
