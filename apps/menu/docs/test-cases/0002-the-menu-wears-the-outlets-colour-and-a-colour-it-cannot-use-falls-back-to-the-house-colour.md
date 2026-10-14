---
type: Test Case
title: "2. The menu wears the outlet's colour, and a colour it cannot use falls back to the house colour"
description: Protects each café's branding on its guest menu, and the page from a malformed colour.
tags: [test-cases, qr, menu, branding]
status: Proposed
origin_repo: bhojnalya
timestamp: 2026-10-14T00:00:00Z
---

# 2. The menu wears the outlet's colour, and a colour it cannot use falls back to the house colour

Date: 2026-10-14

## Status

Proposed

## Given

- A menu as in [menu 0001](./0001-a-tables-qr-link-opens-that-outlets-menu-and-any-other-link-says-it-is-not-one.md),
  whose outlet has a primary colour.

## When

1. The guest opens the table's link.

## Then

- **The outlet's colour is set once, as a variable on the page**, and the
  logo disc and selected category take it from there, so a café's colour
  changes without a new build.
- A colour that is not six hex digits after `#` is replaced by the house
  colour, so a bad value can neither blank the page nor inject other styles.

## Variations

| Outlet colour | Page colour |
| :-- | :-- |
| `#1D4ED8` | `#1D4ED8` |
| empty, `red`, `#123`, `#12345G` | house colour `#6B3A1F` |
| `#1D4ED8;background:url(x)` | house colour `#6B3A1F` |

## Procedure

### Setup

`pnpm install` at the repo root on Node 22.

### Run

`pnpm --filter @bhojnalya/menu dev`, open `/t/anything`, inspect the page root.

### Verify

The root carries `--brand: #6B3A1F`; the logo disc and the selected category
chip are that colour.

## Coverage

- `brandingStyle › sets the outlet's colour as the --brand CSS variable` (unit)
- `brandingStyle › falls back to the house colour for %j` (unit, one per bad value)
- `MenuPage › sets the outlet's colour as the --brand CSS variable on the page` (component)
- The logo image: **not built** (initials stand in).

Command: `pnpm --filter @bhojnalya/menu test`

## References

- [menu 0001](./0001-a-tables-qr-link-opens-that-outlets-menu-and-any-other-link-says-it-is-not-one.md)
