---
type: Test Case
title: "13. A revoked or replaced device is refused on its next request, and a replaced one's last invoice number is kept"
description: Lets an owner cut off a lost or reinstalled till at once, while its code and the last invoice it synced stay on record so no number repeats.
tags: [test-cases, auth, devices, invoice-numbering]
status: Proposed
origin_repo: bhojnalya
timestamp: 2026-10-14T00:00:00Z
---

# 13. A revoked or replaced device is refused on its next request, and a replaced one's last invoice number is kept

Date: 2026-10-14

## Status

Proposed

## Given

- A device registered as in [api 0012](./0012-a-registered-device-gets-its-outlets-next-unused-code-and-a-token-the-server-keeps-only-as-a-hash.md).
- For the replacement: invoices from it already synced in two financial years.

## When

1. The device asks who it is with its token.
2. The owner revokes it, twice; it asks again.
3. A made-up device token is presented.
4. Another tenant's owner tries to revoke it.
5. The owner registers a new device in place of the old one; then tries to
   replace the old one again, and to replace a device of another outlet.

## Then

- **A device token signs the device in for its own outlet only**, and it can
  read its own record and its outlet's invoice prefix.
- **After revocation the token gets 401 `UNAUTHENTICATED` on its next request**;
  revoking again changes nothing; the code stays taken.
- A token the server never issued gets 401.
- Another tenant's owner gets 404 and the device keeps working.
- **Replacing a device retires it, records the last invoice number synced from
  it in the latest financial year, links it to its replacement, and ends its
  token**; the new device gets the next code, and the retired code is never
  handed out again. A device that never synced records no number.
- A revoked device may still be replaced; one already replaced gets 409
  `CONFLICT`; one of another outlet gets 404.
- The retirement is written to the audit log with the last number and the
  replacement.

## Procedure

### Setup

As in [api 0009](./0009-an-owner-signs-in-with-an-email-or-phone-and-a-password-and-a-failed-sign-in-reveals-nothing.md);
synced invoice counters are seeded directly in the database.

### Run

`pnpm --filter @bhojnalya/api test:int`

### Verify

The `a device token` and `re-provisioning a device` suites pass.

## Coverage

- `a device token › signs the device in for its own outlet only, as itself` (integration)
- `a device token › is refused with 401 once the owner revokes the device, and the code stays taken` (integration)
- `a device token › is refused with 401 when it is not a token the server issued` (integration)
- `a device token › cannot revoke a device of another tenant: 404, and the device keeps working` (integration)
- `re-provisioning a device › retires the old code for good, recording the last invoice number synced from it` (integration)
- `re-provisioning a device › records no invoice number for a device that never synced one` (integration)
- `re-provisioning a device › can replace a revoked device, but not one already replaced (409), nor one of another outlet (404)` (integration)
- What a revoked till does with invoices it has not synced yet: **not built**.

Command: `pnpm --filter @bhojnalya/api test:int`

## References

- [ADR 0007](../../../../docs/decisions/0007-an-invoice-number-comes-from-a-device-series.md)
- [ADR 0027](../../../../docs/decisions/0027-who-a-request-acts-for-is-read-fresh-on-every-request.md)
