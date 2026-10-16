---
type: Test Case
title: "11. A password is reset only with the latest emailed code, within 10 minutes and 5 guesses"
description: Lets an owner who forgot their password back in through their email, without letting anyone guess a code or learn which emails have accounts.
tags: [test-cases, auth]
status: Proposed
origin_repo: bhojnalya
timestamp: 2026-10-14T00:00:00Z
---

# 11. A password is reset only with the latest emailed code, within 10 minutes and 5 guesses

Date: 2026-10-14

## Status

Proposed

## Given

- An owner with a password and an open sign-in, and a mail transport that
  records what it sends.

## When

1. A reset is requested for the owner's email; a six-digit code is emailed.
2. The code is confirmed with a new password.
3. A reset is requested for an email no account has.
4. Wrong codes are tried; a code is tried 10 minutes after it was sent; a
   second code is requested and the first is tried.

## Then

- **The right code sets the new password, the old one stops working, and
  every open sign-in is ended.** The code works once.
- **A request for an unknown email gets the same 202 with an empty body, and
  nothing is sent.**
- A wrong code gets 400 `INVALID_RESET_CODE`. After 5 wrong guesses the code
  is spent, and even the right one is refused.
- A code is refused from 10 minutes after it was sent.
- Requesting a new code spends the older one.
- Only a hash of the code keyed by a server secret is stored, and the code is
  never logged.

## Variations

| Code | Outcome |
| :-- | :-- |
| right, first use, within 10 min | 204 |
| right, second use | 400 `INVALID_RESET_CODE` |
| right, after 5 wrong guesses | 400 |
| right, at 10 min | 400 |
| older of two | 400 |

## Procedure

### Setup

As in [api 0009](./0009-an-owner-signs-in-with-an-email-or-phone-and-a-password-and-a-failed-sign-in-reveals-nothing.md);
the test replaces the mail transport and the clock.

### Run

`pnpm --filter @bhojnalya/api test:int`

### Verify

The `password reset by email code` suite passes.

## Coverage

- `password reset by email code › sets the new password, retires the old one and signs out every session` (integration)
- `password reset by email code › answers an unknown email exactly as a known one, and sends nothing` (integration)
- `password reset by email code › refuses a wrong code with 400 INVALID_RESET_CODE and spends the code after 5 wrong guesses` (integration)
- `password reset by email code › refuses a code 10 minutes after it was sent` (integration)
- `password reset by email code › spends an older code when a newer one is sent` (integration)
- `password reset by email code › keeps only a keyed hash of the code, and never logs it` (integration)
- Sending real email: **not built**. Development prints the message to the
  terminal; production drops it with a warning.
- Limiting how many codes one address may request: **not built**.

Command: `pnpm --filter @bhojnalya/api test:int`

## References

- [ADR 0019](../../../../docs/decisions/0019-a-caller-without-a-tenant-may-learn-only-which-tenant-holds-its-secret.md)
