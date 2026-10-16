---
type: Test Case
title: "9. An owner signs in with an email or phone and a password, and a failed sign-in reveals nothing"
description: Lets an owner in with what they remember while giving a stranger no hint of which accounts exist and keeping every secret out of bodies, storage and logs.
tags: [test-cases, auth]
status: Proposed
origin_repo: bhojnalya
timestamp: 2026-10-14T00:00:00Z
---

# 9. An owner signs in with an email or phone and a password, and a failed sign-in reveals nothing

Date: 2026-10-14

## Status

Proposed

## Given

- A tenant with two outlets and an owner of both, whose password is stored as
  an Argon2id hash.

## When

1. The owner signs in with their email in upper case, then with their phone.
2. Someone signs in with the right email and a wrong password, and with an
   email no account has.
3. The owner's account is disabled and they sign in again.

## Then

- **Sign-in answers with an access token, the user, and each outlet with the
  role held there.** The access token opens a request for the owner's tenant.
- The refresh token is set only as a cookie that scripts cannot read, sent only
  over HTTPS, only to the sign-in paths and only from the same site, for 30
  days. It never appears in the body, and only its hash is stored.
- **A wrong password, an unknown login and a disabled account get the same
  401 `INVALID_CREDENTIALS` with the same message**, and no cookie.
- The password, the refresh token and the access token never appear in the logs.
- Passwords are hashed with Argon2id at 19 MiB, 2 passes and one lane; a wrong
  password or a malformed stored hash never verifies.

## Variations

| Login | Password | Outcome |
| :-- | :-- | :-- |
| email, any case | right | 200 |
| phone | right | 200 |
| email | wrong | 401 `INVALID_CREDENTIALS` |
| unknown email | any | 401 `INVALID_CREDENTIALS` |
| disabled account | right | 401 `INVALID_CREDENTIALS` |

## Procedure

### Setup

`pnpm install` at the repo root on Node 22, with Docker running. The run
starts its own Postgres with the same roles as `infra/`, applies the
migrations, and builds the real API connected as the application role. Owners
are seeded directly in the database.

### Run

`pnpm --filter @bhojnalya/api test:int` and `pnpm --filter @bhojnalya/api test`

### Verify

The `POST /auth/login` and `Argon2PasswordHasher` suites pass.

## Coverage

- `POST /auth/login › signs an owner in by email in any case, and the access token opens their tenant` (integration)
- `POST /auth/login › signs an owner in by phone` (integration)
- `POST /auth/login › sets the refresh token only as an httpOnly, Secure, SameSite=Strict cookie on the auth path` (integration)
- `POST /auth/login › answers a wrong password and an unknown login with the same 401 INVALID_CREDENTIALS` (integration)
- `POST /auth/login › refuses a disabled account with the same answer as a wrong password` (integration)
- `POST /auth/login › never writes the password or a token into the logs` (integration)
- `Argon2PasswordHasher › stores an Argon2id hash with 19 MiB, 2 passes and one lane, never the password` (unit)
- `Argon2PasswordHasher › verifies the right password and refuses a wrong one or a malformed hash` (unit)
- Limiting how often one login or one address may try: **not built**.
- Equal response time for an unknown login and a wrong password: done by
  verifying against a throwaway hash; not measured by a test.

Command: `pnpm --filter @bhojnalya/api test:int`

## References

- [ADR 0019](../../../../docs/decisions/0019-a-caller-without-a-tenant-may-learn-only-which-tenant-holds-its-secret.md)
- [ADR 0027](../../../../docs/decisions/0027-who-a-request-acts-for-is-read-fresh-on-every-request.md)
