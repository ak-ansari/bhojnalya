---
type: Test Case
title: "2. Every id a client makes is a lowercase UUIDv7 carrying its creation time"
description: Protects offline record creation from id collisions and keeps one spelling per id across devices, the server and logs.
tags: [test-cases, ids, idempotency, contracts]
status: Proposed
origin_repo: bhojnalya
timestamp: 2026-10-14T00:00:00Z
---

# 2. Every id a client makes is a lowercase UUIDv7 carrying its creation time

Date: 2026-10-14

## Status

Proposed

## Given

- A device that creates a record, online or offline, with a clock and a
  source of randomness.

## When

1. The device makes a new id.
2. An id or an idempotency key arrives in a document or a request.

## Then

- **A new id is a version 7 UUID** in lower case, whose first 48 bits are
  the creation time in milliseconds and whose version and variant bits are
  right whatever the random bits are.
- Ids made in a later millisecond sort after ids made in an earlier one. Ids
  in the same millisecond are not ordered.
- A time before 1970 or past the 48-bit range is refused rather than wrapped.
- Two ids made with real randomness differ.
- **An id that is upper case, another UUID version, the wrong variant or not
  hyphenated is refused**, so one record never has two spellings.
- An idempotency key is any lower-case UUID (a guest's browser may make a
  version 4). It travels in the `Idempotency-Key` header.

## Variations

| Input | Outcome |
| :-- | :-- |
| 2026-10-14T06:30:00Z, random bytes all 0 | `01a1391a-7e40-7000-8000-000000000000` |
| time 0, random bytes all 0xff | `00000000-0000-7fff-bfff-ffffffffffff` |
| time −1 or 2^48 ms | refused |
| `01A1391A-7E40-…` (upper case) | refused |
| `…-4069-…` (version 4) as a record id | refused |
| `3b241101-e2bb-4255-8caf-4136c566a962` as an idempotency key | accepted |

## Procedure

### Setup

`pnpm install` at the repo root on Node 22.

### Run

`pnpm --filter @bhojnalya/contracts test`

### Verify

The `newId`, `Uuidv7` and `IdempotencyKey` suites pass.

## Coverage

- `newId › puts the injected millisecond in the first 48 bits, version 7 and the RFC variant` (unit)
- `newId › keeps the version and variant bits whatever the random bytes are` (unit)
- `newId › makes a valid lowercase UUIDv7 for any time in range and any randomness` (unit, property)
- `newId › sorts ids made in later milliseconds after earlier ones` (unit)
- `newId › refuses a time before 1970 or past the 48-bit range` (unit)
- `newId › defaults to the real clock and Web Crypto` (unit)
- `Uuidv7 › accepts a lowercase v7` (unit)
- `Uuidv7 › refuses %s (%s)` (unit, table)
- `IdempotencyKey › is sent in the Idempotency-Key header` (unit)
- `IdempotencyKey › accepts a lowercase v7 or v4 UUID and refuses anything else` (unit)
- The server returning the stored result for a repeated key: **not built**.

Command: `pnpm --filter @bhojnalya/contracts test`

## References

- [ADR 0009 Ids are made by the client](../../../../docs/decisions/0009-ids-are-made-by-the-client.md)
