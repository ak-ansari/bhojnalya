---
type: Test Case
title: "4. A suspended outlet's changes are refused, but its reads and record-keeping are not"
description: Stops new sales at a suspended outlet without ever losing the records it already made.
tags: [test-cases, suspension, subscriptions]
status: Proposed
origin_repo: bhojnalya
timestamp: 2026-10-14T00:00:00Z
---

# 4. A suspended outlet's changes are refused, but its reads and record-keeping are not

Date: 2026-10-14

## Status

Proposed

## Given

- A tenant with one suspended outlet and one active outlet, and another tenant.

## When

1. A principal acting for the suspended outlet sends a change.
2. It reads.
3. It sends record-keeping that the route marks as allowed while suspended.
4. It sends a change acting for the active outlet.
5. It sends a change acting for the other tenant's outlet.

## Then

- **The change is refused with 402 `OUTLET_SUSPENDED` naming the outlet, and nothing is written.**
- Reads still answer.
- **Record-keeping marked as allowed still runs.**
- The tenant's active outlet is unaffected.
- An outlet the principal's tenant cannot see is refused with 403 `FORBIDDEN`.

## Procedure

### Setup

`pnpm install` at the repo root on Node 22, with Docker running. The run
starts its own Postgres container with the same roles as `infra/`, applies the
migrations and installs the job queue as the migration owner, then builds the
real API connected as the application role. A test-only guard stands in for
sign-in and takes the principal from a request header.

### Run

`pnpm --filter @bhojnalya/api test:int`

### Verify

The `SuspendedOutletInterceptor` suite passes.

## Coverage

- `SuspendedOutletInterceptor › refuses a change for a suspended outlet with 402 OUTLET_SUSPENDED and writes nothing` (integration)
- `SuspendedOutletInterceptor › still answers reads for a suspended outlet` (integration)
- `SuspendedOutletInterceptor › still accepts record-keeping a route marks as allowed while suspended` (integration)
- `SuspendedOutletInterceptor › accepts changes for the same tenant's other, active outlet` (integration)
- `SuspendedOutletInterceptor › refuses with 403 FORBIDDEN a principal whose outlet is another tenant's` (integration)
- Which real routes are record-keeping (invoice sync, billing served tables): **not built**.

Command: `pnpm --filter @bhojnalya/api test:int`

## References

- [ADR 0015](../../../../docs/decisions/0015-suspension-stops-new-sales-never-record-keeping.md)
