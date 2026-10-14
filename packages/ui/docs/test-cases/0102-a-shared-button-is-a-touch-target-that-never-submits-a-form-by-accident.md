---
type: Test Case
title: "102. A shared button is a touch target that never submits a form by accident"
description: Protects a busy counter from missed taps and from a stray tap sending a half-filled form.
tags: [test-cases, components, touch]
status: Proposed
origin_repo: bhojnalya
timestamp: 2026-10-14T00:00:00Z
---

# 102. A shared button is a touch target that never submits a form by accident

Date: 2026-10-14

## Status

Proposed

## Given

- A screen that uses the shared button, in any of its styles.

## When

1. The button is rendered, alone or inside a form.
2. A screen restyles its text colour.

## Then

- **Every size is at least 48 px tall**, the minimum touch height.
- A button that does not ask to submit is a plain button, so tapping it
  inside a form does not send the form.
- A screen's own text colour replaces the style's, and the button keeps its
  font size.

## Procedure

### Setup

`pnpm install` at the repo root on Node 22.

### Run

`pnpm --filter @bhojnalya/ui test`

### Verify

The `Button` suite passes.

## Coverage

- `Button › is a plain button by default so it never submits a form by accident` (component)
- `Button › keeps the 48 px touch height whatever the variant` (component)
- `Button › lets a caller override the text colour without losing the font size` (component)
- The rendered height on a real tablet: **GAP**, jsdom has no layout; checked
  only by the class name.

Command: `pnpm --filter @bhojnalya/ui test`

## References

- [ADR 0013 The till and the kitchen are one app; the guest menu is another](../../../../docs/decisions/0013-the-till-and-the-kitchen-are-one-app-the-guest-menu-is-another.md)
