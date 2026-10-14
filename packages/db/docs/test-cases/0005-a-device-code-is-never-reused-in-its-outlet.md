---
type: Test Case
title: "5. A device code is never reused in its outlet"
description: Protects the invoice series: a code that came back would let two devices print the same invoice number.
tags: [test-cases, identity, devices, invoice-numbering]
status: Proposed
origin_repo: bhojnalya
timestamp: 2026-10-14T00:00:00Z
---

# 5. A device code is never reused in its outlet

Date: 2026-10-14

## Status

Proposed

## Given

- A tenant with two outlets, and the application acting in that tenant's context.

## When

1. A device is registered with a code, and later retired.
2. A new device in the same outlet is registered with the same code.
3. The application tries to delete a device.

## Then

- **A retired device keeps its code taken: the new device in the same outlet is
  refused.**
- The application cannot delete a device, so a code can never be freed.
- The same code in a different outlet is allowed, because each outlet's
  invoice prefix differs.
- A code is exactly two upper-case base-36 characters.

## Variations

| Code | Where | Outcome |
| :-- | :-- | :-- |
| `1Z` | same outlet as a retired `1Z` | refused |
| `2Y` | another outlet of the tenant | accepted |
| `0a` | any | refused |

## Procedure

### Setup

`pnpm install` at the repo root on Node 22, with Docker running. The run
starts its own Postgres container with the same roles as `infra/`, and
applies the migrations as the migration owner.

### Run

`pnpm --filter @bhojnalya/db test:int`

### Verify

The `devices` suite passes.

## Coverage

- `devices › keeps a retired device code taken, so a new device in that outlet cannot reuse it` (integration)
- `devices › allows the same code in another outlet, whose invoice prefix differs` (integration)
- `devices › refuses app_user a delete, so a device row and its code outlive retirement` (integration)
- `devices › accepts only two upper-case base36 characters as a code` (integration)
- Assigning a fresh code on registration and on re-provisioning: **not built**.

Command: `pnpm --filter @bhojnalya/db test:int`

## References

- [ADR 0007](../../../../docs/decisions/0007-an-invoice-number-comes-from-a-device-series.md)
