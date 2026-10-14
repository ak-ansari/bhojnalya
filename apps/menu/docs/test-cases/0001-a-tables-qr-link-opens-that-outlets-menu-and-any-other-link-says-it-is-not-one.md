---
type: Test Case
title: "1. A table's QR link opens that outlet's menu, and any other link says it is not one"
description: Protects the guest's first screen after scanning, and the guest who arrives on a wrong or mistyped link.
tags: [test-cases, qr, menu]
status: Proposed
origin_repo: bhojnalya
timestamp: 2026-10-14T00:00:00Z
---

# 1. A table's QR link opens that outlet's menu, and any other link says it is not one

Date: 2026-10-14

## Status

Proposed

## Given

- A guest at a table holds a link of the table-QR form, a path of `t` and a
  token.
- Today every token reads the same placeholder menu: Brew & Bun Café, table
  T9. Fetching the outlet's real menu by its token is **not built**.

## When

1. The guest opens the link.
2. Separately, a guest opens a link that is not of the table-QR form.

## Then

- **The table-QR link shows the outlet's name, the table, and that the guest
  orders here and pays at the counter**, so the guest knows they are on the
  right menu.
- The first category opens with its dishes, each with its diet mark, name,
  price and description.
- **A sold-out dish is marked Unavailable and says it is sold out instead of
  describing it**, so nobody chooses a dish the kitchen cannot make.
- Any other link says it is not a table's menu and tells the guest to scan
  again or ask staff, and shows no menu.

## Variations

| Link | Outcome |
| :-- | :-- |
| `/t/4fK9qXbT2mLw8ZcR1sVyNp` | Brew & Bun Café, table T9, Cold coffee |
| `/menu` | "This link isn't a table's menu" |

## Procedure

### Setup

`pnpm install` at the repo root on Node 22.

### Run

`pnpm --filter @bhojnalya/menu dev`, then open `/t/anything` and `/menu`.

### Verify

The first shows the café's menu with Vietnamese Iced Coffee marked
Unavailable; the second shows the not-a-table message.

## Coverage

- `MenuPage › opens a table's QR link on the outlet's menu for that table` (component)
- `MenuPage › marks a sold-out dish unavailable instead of describing it` (component)
- `MenuPage › tells the guest when the link is not a table's QR link` (component)
- Loading the outlet's menu for the token: **not built**.
- E2E in a real browser: **GAP**.

Command: `pnpm --filter @bhojnalya/menu test`

## References

- [ADR 0013](../../../../docs/decisions/0013-the-till-and-the-kitchen-are-one-app-the-guest-menu-is-another.md)
