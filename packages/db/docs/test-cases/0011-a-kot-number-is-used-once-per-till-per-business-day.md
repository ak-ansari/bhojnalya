---
type: Test Case
title: "11. A KOT number is used once per till per business day"
description: Lets two tills number kitchen tickets offline without clashing, while a till never repeats a number on one day.
tags: [test-cases, kitchen]
status: Proposed
origin_repo: bhojnalya
timestamp: 2026-10-14T00:00:00Z
---

# 11. A KOT number is used once per till per business day

Date: 2026-10-14

## Status

Proposed

## Given

- An outlet with two tills and an open order.

## When

1. The first till stores KOT 1 for a business day.
2. The second till stores KOT 1 for the same day; the first till stores KOT 1
   for the next day; the first till stores KOT 1 for the first day again.
3. The server stores a KOT with no till, numbered 1, twice on one day.

## Then

- **A till's number repeats only across days; on one day it is refused.**
- Another till may use the same number on the same day.
- Tickets the server makes without a till share one series of their own, and
  a repeat in it is refused.

## Variations

| Till | Business day | KOT no | Outcome |
| :-- | :-- | :-- | :-- |
| first | 15 Oct | 1 | stored |
| second | 15 Oct | 1 | stored |
| first | 16 Oct | 1 | stored |
| first | 15 Oct | 1 | refused |
| none | 17 Oct | 1, twice | second refused |

## Procedure

### Setup

`pnpm install` at the repo root on Node 22, with Docker running. The run
starts its own Postgres container with the same roles as `infra/`, and
applies the migrations as the migration owner.

### Run

`pnpm --filter @bhojnalya/db test:int`

### Verify

The `kots` suite passes.

## Coverage

- `kots › number from 1 per device per business day, so two tills never clash` (integration)
- `kots › give server-made tickets, which have no device, one series of their own` (integration)
- Choosing the next number and the business day: **not built**.

Command: `pnpm --filter @bhojnalya/db test:int`

## References

- [ADR 0016](../../../../docs/decisions/0016-indian-time-is-a-fixed-offset-never-the-devices-zone.md)
