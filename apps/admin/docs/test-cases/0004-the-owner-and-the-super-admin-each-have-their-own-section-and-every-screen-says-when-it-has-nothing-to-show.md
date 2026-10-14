---
type: Test Case
title: "4. The owner and the super admin each have their own section, and every screen says when it has nothing to show"
description: Protects owners and support staff from landing on a blank screen or in the other person's section.
tags: [test-cases, navigation, empty-states]
status: Accepted
origin_repo: bhojnalya
timestamp: 2026-10-14T00:00:00Z
---

# 4. The owner and the super admin each have their own section, and every screen says when it has nothing to show

Date: 2026-10-14

## Status

Accepted

## Given

- The admin opened at some address.

## When

1. The address is the site root, a section root, a screen, or nothing the
   admin knows.

## Then

- **The owner's section (dashboard, menu and stock, reports) and the
  platform section (outlets) each have their own navigation**; the platform
  screens never show the owner's navigation.
- The navigation marks the screen being shown as the current page.
- The site root and the owner section root open the owner's dashboard; the
  platform section root opens the outlet list.
- Each screen says in words what it would show and that there is nothing yet,
  never a blank area. The data behind each screen: **not built**.
- An unknown address says the page was not found and links back to the
  dashboard.
- Sign-in being required before a section opens: **not built**.

## Variations

| Opened at | Shows |
| :-- | :-- |
| `/` | owner dashboard |
| `/owner` | owner dashboard |
| `/owner/menu` | menu and stock |
| `/owner/reports` | reports |
| `/platform` | outlet list |
| `/owner/nothing-here` | page not found |

## Procedure

### Setup

`pnpm install` at the repo root on Node 22, then `pnpm --filter @bhojnalya/admin dev`.

### Run

Open each address in Variations.

### Verify

Each shows the screen named, with its section's navigation and its words for
nothing yet.

## Coverage

- `ROUTES › sends %s to %s` (component, one per redirect row)
- `ROUTES › says in words when an address leads nowhere` (component)
- `OwnerDashboardPage › shows the dashboard in words when there is nothing to show yet` (component)
- `OwnerDashboardPage › sits in the owner shell with Dashboard marked as the current page` (component)
- `OwnerMenuPage › shows menu and stock in words when there are no items yet` (component)
- `OwnerReportsPage › shows reports in words when the outlet has not billed yet` (component)
- `PlatformOutletsPage › shows the outlet list in words when there are no outlets, in the platform shell` (component)
- The built bundle served by a real browser: **GAP** (no e2e for the admin yet).

Command: `pnpm --filter @bhojnalya/admin test`

## References

- [ADR 0014 Built for chains, shipped for cafés](../../../../docs/decisions/0014-built-for-chains-shipped-for-cafes.md)
