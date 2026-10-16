---
type: Test Case
title: "7. A sign-in or device registration body is refused unless every field has its agreed shape"
description: Keeps the apps and the API agreeing on sign-in, password reset, access-token claims and device registration, so a malformed request fails at the boundary.
tags: [test-cases, auth, devices]
status: Proposed
origin_repo: bhojnalya
timestamp: 2026-10-16T00:00:00Z
---

# 7. A sign-in or device registration body is refused unless every field has its agreed shape

Date: 2026-10-16

## Status

Proposed

## Given

- The shared sign-in, password reset, access-token and device schemas.

## When

1. Each is given a well-formed value and near-miss values.

## Then

- **A sign-in takes a login and a password**; the login is trimmed and an
  empty password is refused.
- A reset confirmation needs a six-digit code and a new password of at least
  8 characters.
- **Access-token claims carry a literal scope**: `tenant` is read; any other
  word is refused.
- A device code is two characters from `0`–`9` and `A`–`Z`, upper case only.
- A device registration needs a client-made UUIDv7 id, an outlet and a role
  of `pos` or `kds`.
- The error codes `INVALID_CREDENTIALS`, `INVALID_RESET_CODE` and
  `DEVICE_CODES_EXHAUSTED` are spelled as their literals.

## Variations

| Value | Outcome |
| :-- | :-- |
| code `004217` | read |
| code `4217` | refused |
| new password `short` | refused |
| scope `owner` | refused |
| device code `0A` / `0a` / `A` | read / refused / refused |
| registration id a UUIDv4 | refused |
| role `printer` | refused |

## Procedure

### Setup

`pnpm install` at the repo root on Node 22.

### Run

`pnpm --filter @bhojnalya/contracts test`

### Verify

The `LoginRequest`, `PasswordResetConfirm`, `AccessClaims`, `DeviceCode`,
`RegisterDeviceRequest` and `ERROR_CODES` suites pass.

## Coverage

- `LoginRequest › takes an email or phone and a password, trimming the login` (unit)
- `LoginRequest › refuses an empty password` (unit)
- `PasswordResetConfirm › needs a six-digit code and a new password of at least 8 characters` (unit)
- `AccessClaims › reads a tenant token with its literal scope` (unit)
- `DeviceCode › is two characters 0-9 or A-Z` (unit)
- `RegisterDeviceRequest › needs a client-made UUIDv7 id, an outlet and a role` (unit)
- `ERROR_CODES › spells the shared codes as their literals` (unit)
- The API asserting the same shapes on its side: the API's sign-in and device
  cases; no shared fixture yet.

Command: `pnpm --filter @bhojnalya/contracts test`

## References

- [contracts 0004](./0004-every-api-error-reads-as-a-code-a-message-and-a-request-id.md)
- [contracts 0006](./0006-the-shared-vocabularies-are-closed-lists-of-literal-values.md)
