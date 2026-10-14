---
type: Test Case
title: "3. The sign-in form names the rule a field breaks and sends nothing yet"
description: Protects owners from vague sign-in errors, and testers from mistaking the stub for a working sign-in.
tags: [test-cases, sign-in, forms]
status: Accepted
origin_repo: bhojnalya
timestamp: 2026-10-14T00:00:00Z
---

# 3. The sign-in form names the rule a field breaks and sends nothing yet

Date: 2026-10-14

## Status

Accepted

## Given

- The sign-in screen, with an empty form.

## When

1. The owner submits without filling it in, or leaves a field holding
   something that breaks its rule.
2. The owner submits a valid email or mobile number and password.

## Then

- Each field shows a hint under it until it is wrong; **then the rule it
  broke replaces the hint in the same place**, so the form does not jump.
- A field is checked as soon as the owner leaves it, not only on submit.
- A failed submit puts the cursor in the first wrong field.
- The sign-in name is an email address or a 10-digit Indian mobile number
  starting with 6, 7, 8 or 9; spaces around it are ignored. The password is
  at least 8 characters.
- A valid submit says plainly that sign-in is not connected yet and nothing
  was sent. Signing in for real: **not built**.

## Variations

| Sign-in name | Password | Outcome |
| :-- | :-- | :-- |
| owner@brewbun.in | 8+ characters | accepted |
| 9876543210 | 8+ characters | accepted |
| "  9876543210 " | 8+ characters | accepted as 9876543210 |
| 987654321 (9 digits) | any | name refused |
| 98765432101 (11 digits) | any | name refused |
| 5876543210 | any | name refused |
| +919876543210 | any | name refused |
| owner@ | any | name refused |
| valid | 7 characters | password refused |
| valid | exactly 8 characters | accepted |

## Procedure

### Setup

`pnpm install` at the repo root on Node 22, then `pnpm --filter @bhojnalya/admin dev`.

### Run

Open `/login`, press Sign in on the empty form, then fill in a valid form and
press it again.

### Verify

Both fields show their rule in red and the cursor is in the first; the valid
submit says nothing was sent.

## Coverage

- `LoginSchema › accepts an email address or a 10-digit Indian mobile number` (unit)
- `LoginSchema › trims the identifier before checking it` (unit)
- `LoginSchema › refuses an identifier that is %s, naming the rule` (unit, one per refused row)
- `LoginSchema › refuses a password shorter than 8 characters and accepts one of exactly 8` (unit)
- `LoginPage › shows the sign-in form with a hint under each field` (component)
- `LoginPage › replaces each hint with the rule it broke and focuses the first invalid field on a failed submit` (component)
- `LoginPage › checks a field when it loses focus, before any submit` (component)
- `LoginPage › says plainly that nothing was sent when a valid form is submitted` (component)

Command: `pnpm --filter @bhojnalya/admin test`

## References

- [admin 0002 While a super admin acts as an owner, every screen says so in red](./0002-while-a-super-admin-acts-as-an-owner-every-screen-says-so-in-red.md)
