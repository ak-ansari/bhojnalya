---
type: Test Case
title: "14. A stored vocabulary holds exactly the values the contract allows"
description: Stops a value the apps may send from failing to store, and a stored value from failing to parse.
tags: [test-cases, contracts]
status: Proposed
origin_repo: bhojnalya
timestamp: 2026-10-14T00:00:00Z
---

# 14. A stored vocabulary holds exactly the values the contract allows

Date: 2026-10-14

## Status

Proposed

## Given

- The closed vocabularies the apps and the API share: order channel, order
  type, kitchen ticket status, tax mode, price mode, device role, payment
  method and sync op type.

## When

1. The values the database accepts for each are compared with the shared
   contract's.

## Then

- **Each holds the same values, in the same order.**

## Procedure

### Setup

`pnpm install` at the repo root on Node 22.

### Run

`pnpm --filter @bhojnalya/db test`

### Verify

The `column enums` suite passes.

## Coverage

- `column enums › hold the same values as the contract for %s` (unit), one per vocabulary

Command: `pnpm --filter @bhojnalya/db test`

## References

- [ADR 0002](../../../../docs/decisions/0002-one-language-runs-on-the-till-and-the-server.md)
