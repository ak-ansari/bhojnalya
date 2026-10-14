---
type: Test Case
title: "2. Every API error reads as a code, a message and the request id, and never a bug's own message"
description: Lets every client branch on one error shape and lets support trace a report to the server log, without leaking internals.
tags: [test-cases, errors, http]
status: Proposed
origin_repo: bhojnalya
timestamp: 2026-10-14T00:00:00Z
---

# 2. Every API error reads as a code, a message and the request id, and never a bug's own message

Date: 2026-10-14

## Status

Proposed

## Given

- The running API.

## When

1. A request sends a body that fails its schema.
2. A request sends malformed JSON.
3. A request asks for a route that does not exist.
4. A request hits a bug.

## Then

- **Each answer is `{ code, message, details?, requestId }`**, with the request id also in the `X-Request-Id` response header.
- A body that fails its schema gets 400 `VALIDATION_FAILED`, with each failing field named in `details`.
- Malformed JSON gets 400 `VALIDATION_FAILED`; an unknown route gets 404 `NOT_FOUND`.
- **A bug gets 500 `INTERNAL_ERROR` with a fixed message**, never the error's own text.
- A caller's sane `X-Request-Id` is kept; otherwise the server makes one.

## Variations

| Failure | Status | Code |
| :-- | :-- | :-- |
| body fails its schema | 400 | `VALIDATION_FAILED` |
| malformed JSON, too large | 400, 413 | `VALIDATION_FAILED` |
| nobody signed in | 401 | `UNAUTHENTICATED` |
| outlet suspended | 402 | `OUTLET_SUSPENDED` |
| unknown route | 404 | `NOT_FOUND` |
| idempotency key reused | 409 | `CONFLICT` |
| anything else | 500 | `INTERNAL_ERROR` |

## Procedure

### Setup

`pnpm install` at the repo root on Node 22, with Docker running. The run
starts its own Postgres container with the same roles as `infra/`, applies the
migrations and installs the job queue as the migration owner, then builds the
real API connected as the application role. A test-only guard stands in for
sign-in and takes the principal from a request header.

### Run

`pnpm --filter @bhojnalya/api test:int` and `pnpm --filter @bhojnalya/api test`

### Verify

The `ErrorEnvelopeFilter` and `toError` suites pass.

## Coverage

- `ErrorEnvelopeFilter › answers a body that fails its schema with 400 VALIDATION_FAILED, the failing fields and the request id` (integration)
- `ErrorEnvelopeFilter › answers malformed JSON with 400 VALIDATION_FAILED in the same envelope` (integration)
- `ErrorEnvelopeFilter › answers an unknown route with 404 NOT_FOUND in the envelope` (integration)
- `ErrorEnvelopeFilter › answers a bug with 500 INTERNAL_ERROR and a generated request id, never the bug's message` (integration)
- `toError › keeps an ApiError’s status, code, message and details` (unit)
- `toError › maps Nest's HTTP exceptions to the shared codes by status` (unit)
- `toError › maps an error carrying a 4xx status, as the body parser throws, to that status` (unit)
- `toError › turns anything else into 500 INTERNAL_ERROR without the error's own message` (unit)

Command: `pnpm --filter @bhojnalya/api test:int` and `pnpm --filter @bhojnalya/api test`

## References

- [contract 0004](../../../../docs/test-cases/0004-every-api-error-reads-as-a-code-a-message-and-a-request-id.md)
