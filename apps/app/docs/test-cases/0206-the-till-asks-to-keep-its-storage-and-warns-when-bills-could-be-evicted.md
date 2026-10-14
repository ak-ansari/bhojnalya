---
type: Test Case
title: "206. The till asks to keep its storage and warns when bills could be evicted"
description: Protects unsynced bills from the browser deleting site data under storage pressure or on an uninstalled iPad.
tags: [test-cases, offline, storage]
status: Proposed
origin_repo: bhojnalya
timestamp: 2026-10-14T00:00:00Z
---

# 206. The till asks to keep its storage and warns when bills could be evicted

Date: 2026-10-14

## Status

Proposed

## Given

- A tablet registered as the billing counter.

## When

1. The till's screens open.

## Then

- **The till asks the browser for persistent storage** (unless it already
  has it).
- If the browser refuses, or has no way to ask, the till says "Bills on this
  tablet are not protected yet." and that the browser may delete saved bills
  when space runs low.
- On an iPad or iPhone not opened from the Home Screen, it says to add
  Bhojnalya to the Home Screen and open it from there.
- With persistent storage granted on a non-Apple tablet, nothing is shown.

## Variations

| Storage | Device | Warning |
| :-- | :-- | :-- |
| granted | any but uninstalled iPad | none |
| refused | Android / desktop | may delete saved bills |
| any | iPad in a Safari tab | add to Home Screen |

## Procedure

### Setup

`pnpm --filter @bhojnalya/app build && pnpm --filter @bhojnalya/app preview`

### Run

Open `/pos` on an iPad in Safari; then add it to the Home Screen and open it
from there.

### Verify

The Home Screen warning shows in Safari and is gone when opened installed.

## Coverage

- `PosLayout › asks for persistent storage and warns when the browser refuses it` (component)
- `PosLayout › tells an iPad not opened from the Home Screen to install the app` (component)
- `PosLayout › shows no storage warning once storage is persistent` (component)
- Real iPad Safari and Chrome on Android (QA): **GAP**, no device run yet.

Command: `pnpm --filter @bhojnalya/app test`

## References

- [ADR 0006 The till is local-first; the kitchen and guests are online](../../../../docs/decisions/0006-the-till-is-local-first-the-kitchen-and-guests-are-online.md)
