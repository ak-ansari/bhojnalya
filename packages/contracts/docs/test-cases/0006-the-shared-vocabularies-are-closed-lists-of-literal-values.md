---
type: Test Case
title: "6. The shared vocabularies are closed lists of literal values"
description: Protects the till, the server and the database from disagreeing on how an order channel, order type, ticket status, tax mode, price mode, device role or payment method is spelled.
tags: [test-cases, contracts]
status: Proposed
origin_repo: bhojnalya
timestamp: 2026-10-14T00:00:00Z
---

# 6. The shared vocabularies are closed lists of literal values

Date: 2026-10-14

## Status

Proposed

## Given

- A value naming where an order came from, how it is served, where a kitchen
  ticket stands, the outlet's GST registration, whether prices include GST,
  what a device is for, or how a payment was received.

## When

1. The value is read.

## Then

- **Each vocabulary is exactly its listed literals**, in snake_case, because
  they are stored and sent as they are.
- A value outside the list, including a near-miss spelling, is refused.

## Variations

| Vocabulary | Values |
| :-- | :-- |
| order channel | `pos`, `qr`, `swiggy`, `zomato` |
| order type | `dine_in`, `takeaway`, `delivery` |
| kitchen ticket status | `new`, `preparing`, `ready` |
| tax mode | `regular`, `composition`, `unregistered` |
| price mode | `inclusive`, `exclusive` |
| device role | `pos`, `kds` |
| payment method | `cash`, `upi`, `card`, `other` |
| `dine-in`, `served` | refused |

## Procedure

### Setup

`pnpm install` at the repo root on Node 22.

### Run

`pnpm --filter @bhojnalya/contracts test`

### Verify

The `shared enums` suite passes.

## Coverage

- `shared enums › %s is exactly its literal values` (unit, one per vocabulary)
- `shared enums › refuses a value outside the list` (unit)
- The database's check constraints using the same values: **not built**.

Command: `pnpm --filter @bhojnalya/contracts test`

## References

- [ADR 0014 Built for chains, shipped for cafés](../../../../docs/decisions/0014-built-for-chains-shipped-for-cafes.md)
