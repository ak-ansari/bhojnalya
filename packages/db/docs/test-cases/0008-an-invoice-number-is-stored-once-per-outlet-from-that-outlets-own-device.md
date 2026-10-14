---
type: Test Case
title: "8. An invoice number is stored once per outlet, from that outlet's own device"
description: Stops a replayed or forged invoice from taking a number twice, and keeps every number within the length GST allows.
tags: [test-cases, billing, invoice-numbering]
status: Proposed
origin_repo: bhojnalya
timestamp: 2026-10-14T00:00:00Z
---

# 8. An invoice number is stored once per outlet, from that outlet's own device

Date: 2026-10-14

## Status

Proposed

## Given

- A tenant with two outlets, each with one registered till.

## When

1. An invoice is stored with a number in the first outlet.
2. A second invoice with the same number is stored in the same outlet, then
   in the second outlet.
3. An invoice is stored with a 17-character number.
4. An invoice in the first outlet names the second outlet's till as its issuer.

## Then

- **The same number is refused a second time in one outlet**, so a number is
  never on two bills.
- The same number is accepted in another outlet: each outlet has its own
  series.
- A number longer than 16 characters is refused.
- An invoice issued by another outlet's till is refused.

## Variations

| Number | Outlet | Issued by | Outcome |
| :-- | :-- | :-- | :-- |
| `AA0A/2627/000002`, second time | first | first outlet's till | refused |
| `AA0A/2627/000003`, second time | second | second outlet's till | stored |
| `AA0A/2627/0000001` (17 chars) | first | first outlet's till | refused |
| `AA0B/2627/000001` | first | second outlet's till | refused |

## Procedure

### Setup

`pnpm install` at the repo root on Node 22, with Docker running. The run
starts its own Postgres container with the same roles as `infra/`, and
applies the migrations as the migration owner.

### Run

`pnpm --filter @bhojnalya/db test:int`

### Verify

The `financial tables` suite passes.

## Coverage

- `financial tables › refuses a second invoice with the same number in one outlet` (integration)
- `financial tables › accepts the same number in another outlet, whose series is its own` (integration)
- `financial tables › refuses an invoice number longer than GST allows` (integration)
- `financial tables › refuses an invoice issued by another outlet's device` (integration)
- The number's exact format and its financial year: checked where the invoice
  is made, **not in the database**.

Command: `pnpm --filter @bhojnalya/db test:int`

## References

- [db 0005](./0005-a-device-code-is-never-reused-in-its-outlet.md)
- [ADR 0007](../../../../docs/decisions/0007-an-invoice-number-comes-from-a-device-series.md)
