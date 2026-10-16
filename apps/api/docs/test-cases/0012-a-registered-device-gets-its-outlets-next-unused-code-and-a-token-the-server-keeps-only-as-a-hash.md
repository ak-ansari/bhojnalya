---
type: Test Case
title: "12. A registered device gets its outlet's next unused code and a token the server keeps only as a hash"
description: Gives every till its own invoice series that no other till in the outlet ever had, even when several register at once, and keeps its long-lived secret out of storage.
tags: [test-cases, auth, devices, invoice-numbering]
status: Proposed
origin_repo: bhojnalya
timestamp: 2026-10-14T00:00:00Z
---

# 12. A registered device gets its outlet's next unused code and a token the server keeps only as a hash

Date: 2026-10-14

## Status

Proposed

## Given

- A signed-in owner of a tenant with two outlets, and another tenant.

## When

1. The owner registers a till, then a kitchen screen, in one outlet, and a till
   in the other.
2. Twenty tills are registered in one outlet at the same moment.
3. A registration is sent with an idempotency key; the same device id is
   registered twice.
4. The owner registers into the other tenant's outlet; a caller with no
   sign-in and a device register.
5. The owner lists an outlet's devices a page at a time, and lists another
   tenant's outlet.

## Then

- **Codes are handed out per outlet in base36 order from `01` and are never
  repeated**: `01`, `02`, … `09`, `0A`, … `0Z`, `10`, … up to `ZZ`, 1,295 per
  outlet.
- **Twenty simultaneous registrations get twenty different codes.**
- The answer carries the token once, with the outlet's invoice prefix. Only
  its SHA-256 hash is stored, and the answer is not kept for an idempotent replay.
- A second registration with the same id gets 409 `CONFLICT` naming the id.
- Another tenant's outlet gets 403 and nothing is registered; no sign-in gets
  401; a device gets 403.
- Each registration is written to the audit log with the owner who made it.
- The list is in code order, includes retired devices, never shows a token,
  and pages by code; another tenant's outlet gets 403.
- When every code is taken, registration gets 409 `DEVICE_CODES_EXHAUSTED`.

## Procedure

### Setup

As in [api 0009](./0009-an-owner-signs-in-with-an-email-or-phone-and-a-password-and-a-failed-sign-in-reveals-nothing.md).

### Run

`pnpm --filter @bhojnalya/api test:int` and `pnpm --filter @bhojnalya/api test`

### Verify

The `POST /devices`, `GET /devices` and `nextDeviceCode` suites pass.

## Coverage

- `POST /devices › gives a new till the outlet's next code, a token shown once, and the outlet's invoice prefix` (integration)
- `POST /devices › stores only the hash of the device token, and keeps no copy of the answer for replay` (integration)
- `POST /devices › refuses a second registration with the same id with 409 CONFLICT, so no second token exists` (integration)
- `POST /devices › gives 20 tills registered at the same moment 20 different codes` (integration)
- `POST /devices › refuses an outlet of another tenant with 403, and registers nothing there` (integration)
- `POST /devices › refuses a caller with no sign-in with 401, and a device token with 403` (integration)
- `POST /devices › writes who registered the device to the audit log` (integration)
- `GET /devices › lists an outlet's devices by code, retired ones included, a page at a time` (integration)
- `GET /devices › refuses another tenant's outlet with 403` (integration)
- `nextDeviceCode › starts an outlet at 01` (unit)
- `nextDeviceCode › counts in base36 with upper-case letters: 09 then 0A, 0Z then 10` (unit)
- `nextDeviceCode › never hands out a taken code, even one whose device was retired` (unit)
- `nextDeviceCode › gives null when every one of the 1,295 codes is taken, and ZZ is the last` (unit)
- The 409 `DEVICE_CODES_EXHAUSTED` answer: no integration test fills an
  outlet; the exhaustion rule is held by the last unit test above.

Command: `pnpm --filter @bhojnalya/api test:int`

## References

- [ADR 0007](../../../../docs/decisions/0007-an-invoice-number-comes-from-a-device-series.md)
- [ADR 0027](../../../../docs/decisions/0027-who-a-request-acts-for-is-read-fresh-on-every-request.md)
