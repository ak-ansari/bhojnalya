---
type: Test Case
title: "5. The menu does not build when its scripts pass 120,000 bytes gzipped"
description: Protects the guest's three-second first load on a low-end phone from a dependency that quietly grows the menu.
tags: [test-cases, qr, menu, performance, build]
status: Proposed
origin_repo: bhojnalya
timestamp: 2026-10-14T00:00:00Z
---

# 5. The menu does not build when its scripts pass 120,000 bytes gzipped

Date: 2026-10-14

## Status

Proposed

## Given

- The guest menu's source and everything it imports.

## When

1. The menu is built, alone or as part of the whole repository's build.

## Then

- **Every script the build emits is gzipped and the sizes summed; over
  120,000 bytes the build fails** and the whole repository's build fails with
  it, so an over-budget menu never ships.
- Exactly 120,000 bytes passes.
- Scripts that are each under the limit still fail when their sum is over it,
  so splitting a script does not get around the budget.
- Every build prints the total and each script's size, pass or fail.

## Variations

| Scripts gzipped | Outcome |
| :-- | :-- |
| today's shell, 67,030 B | builds |
| at the limit exactly | builds |
| one byte over | fails |
| two scripts of ~80,000 B each | fails |
| today's shell plus ~60 KB of incompressible text (127,881 B) | fails |

## Procedure

### Setup

`pnpm install` at the repo root on Node 22.

### Run

`pnpm turbo build --filter @bhojnalya/menu --force`

### Verify

The output reads "guest menu JS is N B gzipped, within its budget of 120000 B".
To see it fail, import a module holding ~60 KB of random base64 text from the
entry point and build again: the build exits non-zero with "OVER its budget".

## Coverage

- `jsBudget › sets the budget at 120 000 bytes of gzipped JS` (unit)
- `jsBudget › sums the gzipped size of every emitted script against the limit` (unit)
- `jsBudget › fails a bundle whose scripts together are over the limit even if each is under it` (unit)
- `jsBudget › passes a bundle exactly at the limit` (unit)
- The check being wired into the build: the build itself, run by
  `pnpm turbo build` (seen failing by hand, as in Procedure).

Command: `pnpm --filter @bhojnalya/menu test`

## References

- [ADR 0013](../../../../docs/decisions/0013-the-till-and-the-kitchen-are-one-app-the-guest-menu-is-another.md)
- [ADR 0023](../../../../docs/decisions/0023-the-guest-menu-keeps-the-full-ui-library-and-counts-every-script-it-ships.md)
