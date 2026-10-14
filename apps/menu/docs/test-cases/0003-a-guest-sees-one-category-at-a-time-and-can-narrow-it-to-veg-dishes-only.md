---
type: Test Case
title: "3. A guest sees one category at a time and can narrow it to veg dishes only"
description: Protects a vegetarian guest from being shown egg or non-veg dishes once they ask for veg only.
tags: [test-cases, qr, menu]
status: Proposed
origin_repo: bhojnalya
timestamp: 2026-10-14T00:00:00Z
---

# 3. A guest sees one category at a time and can narrow it to veg dishes only

Date: 2026-10-14

## Status

Proposed

## Given

- The menu of [menu 0001](./0001-a-tables-qr-link-opens-that-outlets-menu-and-any-other-link-says-it-is-not-one.md),
  open on its first category.

## When

1. The guest picks another category.
2. The guest turns on Veg only.
3. The guest picks a category that has no veg dishes.

## Then

- Picking a category marks it selected and shows only its dishes, in menu
  order.
- **Under Veg only, egg and non-veg dishes are hidden**; only dishes marked
  veg remain. Egg is not veg.
- A category left empty by Veg only says so and how to see everything, rather
  than showing a blank list.

## Variations

| Category | Veg only | Dishes shown |
| :-- | :-- | :-- |
| Snacks | off | Vada Pav, Chicken Momos |
| Snacks | on | Vada Pav |
| Sandwiches | on | none, with the "Turn off Veg only" message |

## Procedure

### Setup

`pnpm install` at the repo root on Node 22.

### Run

`pnpm --filter @bhojnalya/menu dev`, open `/t/anything`, tap Snacks, then Veg
only, then Sandwiches.

### Verify

The dishes match the Variations rows.

## Coverage

- `MenuPage › switches dishes when the guest picks another category` (component)
- `MenuPage › hides egg and non-veg dishes under Veg only, and says so when nothing is left` (component)
- Search: **not built**.

Command: `pnpm --filter @bhojnalya/menu test`

## References

- [menu 0001](./0001-a-tables-qr-link-opens-that-outlets-menu-and-any-other-link-says-it-is-not-one.md)
