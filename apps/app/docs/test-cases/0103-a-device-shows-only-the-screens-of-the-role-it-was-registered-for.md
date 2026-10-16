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
- Or a tablet whose saved choice is not one of those two (edited by hand,
  damaged, or left by another version of the app).

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
- A saved choice that is neither "Billing counter" nor "Kitchen display"
  counts as unregistered: the tablet goes to the set-up screen from any
  address, never to a blank screen with no way out. The roles it accepts are
  exactly the ones the server's contract defines.
- The kitchen's screens are a separate download from the counter's. Every
  build checks it: the build fails if anything a kitchen display downloads
  contains the counter's screens.
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
| saved choice `admin` | kitchen, counter or home | set-up |
| saved choice `123`, `null` state, or text that is not JSON | any | set-up |

## Procedure

### Setup

`pnpm install` at the repo root on Node 22, then
`pnpm --filter @bhojnalya/app dev`.

### Run

Open the app with no site data and choose a role. Then type the other role's
address. Then, in the browser console, run
`localStorage.setItem('bhojnalya.device', '{"state":{"role":"admin"},"version":0}')`
and open `/kds`.

### Verify

The set-up screen appears first, the chosen role's screen next, and the
other role's address returns to it. With the `admin` value, `/kds` shows the
set-up screen. `pnpm --filter @bhojnalya/app build` succeeds; it fails with
"The KDS would download modules it must not" if a kitchen chunk imports a
counter module.

## Coverage

- `app routes › sends an unregistered device to registration, whatever it opens` (component)
- `app routes › lands a device registered as the billing counter on the POS` (component)
- `app routes › lands a device registered as the kitchen display on the KDS` (component)
- `app routes › keeps a kitchen display out of the POS screens` (component)
- `app routes › keeps a billing counter out of the KDS screens` (component)
- `app routes › sends an unknown path to the device home` (component)
- `createDeviceStore › starts unregistered` (unit)
- `createDeviceStore › remembers the chosen role across a reload of the app` (unit)
- `app routes › sends a device whose stored role is unknown to registration from %s, not a blank screen` (component; `/kds`, `/pos`, `/`)
- `createDeviceStore › treats a stored value with %s as unregistered` (unit; the four stored values above)
- `createDeviceStore › accepts exactly the contract's device roles` (unit)
- `forbiddenInKdsChunks › finds the till's own modules in a chunk the KDS loads` (unit)
- `forbiddenInKdsChunks › allows them in chunks only the POS loads` (unit)
- Separate chunks per role on the real build output: the build's bundle
  guard, run by every `build` (see [app 0302](./0302-a-kitchen-display-never-downloads-the-tills-local-database.md)).

Command: `pnpm --filter @bhojnalya/app test` and `pnpm --filter @bhojnalya/app build`

## References

- [ADR 0013 The till and the kitchen are one app; the guest menu is another](../../../../docs/decisions/0013-the-till-and-the-kitchen-are-one-app-the-guest-menu-is-another.md)
