---
type: Test Case
title: "101. An offline device says so and says what still works"
description: Protects staff from mistaking a lost connection for a broken till, and the kitchen from missing that tickets have stopped arriving.
tags: [test-cases, offline, shell]
status: Proposed
origin_repo: bhojnalya
timestamp: 2026-10-14T00:00:00Z
---

# 101. An offline device says so and says what still works

Date: 2026-10-14

## Status

Proposed

## Given

- A device registered as the billing counter or the kitchen display
  ([app 0103](./0103-a-device-shows-only-the-screens-of-the-role-it-was-registered-for.md)).

## When

1. The device loses its network, or starts without one.
2. The network comes back.

## Then

- While online, no connection strip is shown.
- **On the billing counter, the strip says "You're offline." and that
  billing carries on**: bills are saved on the tablet and sync on their own,
  and QR and Swiggy/Zomato orders are paused. Offline is a state, not an
  error, so the cashier keeps working.
- On the kitchen display, the strip says "You're offline.", that it is
  reconnecting, and to use the printed KOTs until then. It does not say to
  keep billing.
- A device that starts with no network shows the strip on its first screen.
- When the network returns, the strip goes away without a reload.
- The strip sits in the screen frame, under the top bar, and is announced
  once to a screen reader.
- The strip follows the browser's own network flag. A network that is up
  while the server is unreachable shows no strip: **not built**.

## Variations

| Role | Network | Strip |
| :-- | :-- | :-- |
| billing counter | up | none |
| billing counter | down | offline, keep billing |
| kitchen display | down | offline, reconnecting, use printed KOTs |
| either | down, then up | shown, then gone |

## Procedure

### Setup

`pnpm install` at the repo root on Node 22, then
`pnpm --filter @bhojnalya/app dev`.

### Run

Register the tablet as the billing counter, then turn on offline mode in the
browser's developer tools (Network → Offline). Turn it off again.

### Verify

The strip appears with the billing copy, then goes away. Repeat as the
kitchen display (clear site data first) and check the reconnecting copy.

## Coverage

- `ConnectionBanner › shows nothing while the device is online` (component)
- `ConnectionBanner › tells the till to keep billing when the network drops` (component)
- `ConnectionBanner › tells the kitchen it is reconnecting and to use printed KOTs` (component)
- `ConnectionBanner › goes away when the network comes back` (component)
- `ConnectionBanner › shows on the first render of a device that starts offline` (component)
- `ConnectionBanner › sits in the POS screen frame under the top bar` (component)
- A real browser going offline and back (e2e): **GAP**, no Playwright suite yet.
- The count of changes waiting to sync in the strip: see [app 0205](./0205-a-till-with-unsynced-changes-cannot-be-cleared-and-always-says-how-many.md).

Command: `pnpm --filter @bhojnalya/app test`

## References

- [ADR 0006 The till is local-first; the kitchen and guests are online](../../../../docs/decisions/0006-the-till-is-local-first-the-kitchen-and-guests-are-online.md)
