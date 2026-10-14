---
type: Test Case
title: "103. A device shows only the screens of the role it was registered for"
description: Protects the kitchen display from loading the till's screens, and an unregistered tablet from reaching either.
tags: [test-cases, device, routing, shell]
status: Proposed
origin_repo: bhojnalya
timestamp: 2026-10-14T00:00:00Z
---

# 103. A device shows only the screens of the role it was registered for

Date: 2026-10-14

## Status

Proposed

## Given

- A tablet that is unregistered, registered as the billing counter, or
  registered as the kitchen display.

## When

1. Someone opens any address in the app.
2. On an unregistered tablet, they choose what the screen is for.

## Then

- **An unregistered tablet is sent to the set-up screen, whatever address
  it opens.**
- Choosing "Billing counter" lands on the counter's screens; choosing
  "Kitchen display" lands on the kitchen's.
- The choice survives closing and reopening the app.
- A kitchen display that opens a counter address is sent to the kitchen's
  screens, and the counter's navigation never renders. A counter that opens
  a kitchen address is sent to the counter's screens.
- An unknown address goes to the device's own screens.
- The kitchen's screens are a separate download from the counter's.
- The choice is a stub kept on the device. Owner sign-in, pairing with the
  server and a device token: **not built**.

## Variations

| Registered as | Opens | Lands on |
| :-- | :-- | :-- |
| nothing | counter | set-up |
| nothing → billing counter | home | counter |
| nothing → kitchen display | home | kitchen |
| kitchen display | counter | kitchen |
| billing counter | kitchen | counter |
| billing counter | unknown | counter |

## Procedure

### Setup

`pnpm install` at the repo root on Node 22, then
`pnpm --filter @bhojnalya/app dev`.

### Run

Open the app with no site data and choose a role. Then type the other role's
address.

### Verify

The set-up screen appears first, the chosen role's screen next, and the
other role's address returns to it. `pnpm --filter @bhojnalya/app build`
lists the counter's and the kitchen's layouts as separate chunks.

## Coverage

- `app routes › sends an unregistered device to registration, whatever it opens` (component)
- `app routes › lands a device registered as the billing counter on the POS` (component)
- `app routes › lands a device registered as the kitchen display on the KDS` (component)
- `app routes › keeps a kitchen display out of the POS screens` (component)
- `app routes › keeps a billing counter out of the KDS screens` (component)
- `app routes › sends an unknown path to the device home` (component)
- `createDeviceStore › starts unregistered` (unit)
- `createDeviceStore › remembers the chosen role across a reload of the app` (unit)
- Separate chunks per role: checked by hand in the build output; **GAP**, no
  automated bundle check.

Command: `pnpm --filter @bhojnalya/app test`

## References

- [ADR 0013 The till and the kitchen are one app; the guest menu is another](../../../../docs/decisions/0013-the-till-and-the-kitchen-are-one-app-the-guest-menu-is-another.md)
