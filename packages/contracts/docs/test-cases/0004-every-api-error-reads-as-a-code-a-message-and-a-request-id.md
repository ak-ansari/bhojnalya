---
type: Test Case
title: "4. Every API error reads as a code, a message and a request id"
description: Protects clients that branch on error codes and support staff who trace a report to the server's logs.
tags: [test-cases, errors, contracts]
status: Proposed
origin_repo: bhojnalya
timestamp: 2026-10-14T00:00:00Z
---

# 4. Every API error reads as a code, a message and a request id

Date: 2026-10-14

## Status

Proposed

## Given

- A request the server refuses or fails.

## When

1. The client reads the error reply.

## Then

- **The reply has a code, a message for people, and the request id** that
  ties it to the server's logs, plus optional details. Without any of the
  three it is not a valid error.
- **A code is SCREAMING_SNAKE_CASE.** A code the client has not seen yet is
  still read, so an older client can read a newer server's error.
- The codes several modules share are spelled as their literals.

## Variations

| Code | Outcome |
| :-- | :-- |
| `VALIDATION_FAILED` with details | read, details kept |
| `NOT_FOUND` without details | read |
| `INVOICE_NO_GAP` (not in the shared list) | read |
| `notFound`, `NOT__FOUND` | refused |

## Procedure

### Setup

`pnpm install` at the repo root on Node 22.

### Run

`pnpm --filter @bhojnalya/contracts test`

### Verify

The `ErrorEnvelope` and `ERROR_CODES` suites pass.

## Coverage

- `ErrorEnvelope › reads { code, message, details?, requestId }` (unit)
- `ErrorEnvelope › requires a code, a message and a request id` (unit)
- `ErrorEnvelope › accepts a code it does not know yet but only in SCREAMING_SNAKE_CASE` (unit)
- `ERROR_CODES › spells the shared codes as their literals` (unit)
- The server emitting this shape for every error: **not built**.

Command: `pnpm --filter @bhojnalya/contracts test`

## References

- [contracts 0003](./0003-a-sync-push-is-1-to-200-typed-ops-with-no-repeated-op-or-sequence-and-nothing-unknown-is-dropped.md) (a refused op carries a code of this form)
