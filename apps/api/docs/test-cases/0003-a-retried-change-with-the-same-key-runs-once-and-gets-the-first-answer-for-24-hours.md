---
type: Test Case
title: "3. A retried change with the same key runs once and gets the first answer for 24 hours"
description: Makes double taps and network retries from tills and guest phones safe.
tags: [test-cases, idempotency, transactions]
status: Proposed
origin_repo: bhojnalya
timestamp: 2026-10-14T00:00:00Z
---

# 3. A retried change with the same key runs once and gets the first answer for 24 hours

Date: 2026-10-14

## Status

Proposed

## Given

- A signed-in principal of a tenant, and a route that creates a floor and answers with a value unique to the run.

## When

1. It sends the change with an idempotency key, then sends it again.
2. It sends a different change with the same key.
3. A change with a key fails, and is retried.
4. A duplicate arrives while the first is still running.
5. The same key is used again after 24 hours.
6. Another tenant uses the same key.
7. The key is not a lowercase UUID.

## Then

- **The retry gets the first answer, marked `Idempotent-Replayed: true`, and the change happens once.**
- The same key with a different change is refused with 409 `CONFLICT` naming the key; nothing runs.
- **A failed change stores nothing**, so its retry runs afresh: the key is stored in the same transaction as the change.
- A duplicate that arrives mid-flight waits for the first, then gets its answer; the change happens once.
- A key lasts 24 hours; after that it runs a new change.
- Keys are per tenant: another tenant's identical key is unrelated.
- A malformed key is refused with 400 `VALIDATION_FAILED`.
- A replay answers with the route's own status code; routes do not set status per response.

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

The `IdempotencyInterceptor` suite passes.

## Coverage

- `IdempotencyInterceptor › replays the stored response to a retry with the same key and runs the request once` (integration)
- `IdempotencyInterceptor › refuses the same key with a different request with 409 CONFLICT and runs nothing` (integration)
- `IdempotencyInterceptor › stores nothing for a request that failed, so its retry runs` (integration)
- `IdempotencyInterceptor › runs a duplicate that arrives while the first is still running once, and replays it` (integration)
- `IdempotencyInterceptor › keeps a key for 24 hours, then lets it run a new request` (integration)
- `IdempotencyInterceptor › keeps one tenant's key apart from another tenant's identical key` (integration)
- `IdempotencyInterceptor › refuses a key that is not a lowercase UUID with 400 VALIDATION_FAILED` (integration)
- Requiring a key on every till and guest change: **not built** (a request without one runs unguarded).
- Purging expired keys: **not built** (an expired key is reused in place).

Command: `pnpm --filter @bhojnalya/api test:int`

## References

- [ADR 0009](../../../../docs/decisions/0009-ids-are-made-by-the-client.md)
