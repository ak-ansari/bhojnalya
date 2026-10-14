---
type: Test Case
title: "10. An order keeps what it sold and what reached the kitchen"
description: Stops a menu edit from rewriting an open order, and stops an item the kitchen has seen from silently disappearing.
tags: [test-cases, ordering, kitchen, snapshot]
status: Proposed
origin_repo: bhojnalya
timestamp: 2026-10-14T00:00:00Z
---

# 10. An order keeps what it sold and what reached the kitchen

Date: 2026-10-14

## Status

Proposed

## Given

- An outlet with a menu item "Masala Chai" at ₹40.00, 5% GST, SAC 996331.

## When

1. An order is taken for it.
2. The menu item is renamed "Kadak Chai", repriced to ₹50.00 at 18%, then
   deleted.
3. Another order's item is sent to the kitchen, then the application tries to
   delete that item, and then the order.

## Then

- **The order item still reads "Masala Chai", ₹40.00, 5%, SAC 996331.**
- An item already sent to the kitchen cannot be deleted; it has to be voided.
- An order cannot be deleted at all.

## Procedure

### Setup

`pnpm install` at the repo root on Node 22, with Docker running. The run
starts its own Postgres container with the same roles as `infra/`, and
applies the migrations as the migration owner.

### Run

`pnpm --filter @bhojnalya/db test:int`

### Verify

The `orders` suite passes.

## Coverage

- `orders › keep the name, price and tax rate they were ordered at after the menu item changes or goes` (integration)
- `orders › refuses to delete an item already sent to the kitchen, and to delete an order at all` (integration)
- Invoice lines and KOT items snapshot the same way, by holding no link to the
  menu that an edit could follow; they have no test of their own.

Command: `pnpm --filter @bhojnalya/db test:int`

## References

- [ADR 0008](../../../../docs/decisions/0008-financial-records-are-append-only.md)
