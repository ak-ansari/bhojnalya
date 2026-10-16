---
type: Test Case
title: "301. A screen that fails to load offers a reload and loses nothing saved on the device"
description: Protects staff from a raw error page with no way out, and unsynced bills from being wiped by the way out.
tags: [test-cases, shell, offline, routing]
status: Proposed
origin_repo: bhojnalya
timestamp: 2026-10-16T00:00:00Z
---

# 301. A screen that fails to load offers a reload and loses nothing saved on the device

Date: 2026-10-16

## Status

Proposed

## Given

- A device registered as the billing counter or the kitchen display
  ([app 0103](./0103-a-device-shows-only-the-screens-of-the-role-it-was-registered-for.md)).
- On the billing counter, changes that have not synced yet
  ([app 0204](./0204-every-till-change-reaches-the-server-in-order-and-leaves-the-device-only-when-acknowledged.md)).
- Part of the app that the screen needs cannot be downloaded: the device is
  offline and that part was never stored, or the tab is older than the last
  release and the part it asks for no longer exists.

## When

1. Someone opens the screen.
2. They press "Reload".

## Then

- **The app shows its own page, "This screen didn't load.", with the brand
  and a "Reload" button, never the browser framework's raw error text.**
  Staff always have a way out that they can reach by touch.
- The page says "Nothing saved on this tablet was lost. Check the internet,
  then reload." In every language the app supports, the text comes from the
  translations.
- **Pressing "Reload" only reloads the page. Unsynced changes stay on the
  device, the device keeps its role, and nothing stored is cleared.** A
  cleared device would lose bills that never reached the server.
- Any screen that fails while rendering, not only while loading, gets the
  same page.
- The page appears on both the billing counter and the kitchen display.

## Variations

| Device | Fails | Shows | After "Reload" |
| :-- | :-- | :-- | :-- |
| kitchen display | the kitchen's screens | the app's page | page reloads |
| billing counter | the counter's screens | the app's page | page reloads |
| billing counter, 2 changes unsynced | the counter's screens | the app's page | 2 changes still waiting, role kept |

## Procedure

### Setup

`pnpm install` at the repo root on Node 22, then
`pnpm --filter @bhojnalya/app build && pnpm --filter @bhojnalya/app preview`.

### Run

Register the tablet as the billing counter. In the browser's developer
tools, block the request for the counter's layout chunk (`PosLayout-*.js`),
or unregister the service worker, go offline and open `/pos` in a new tab.

### Verify

The app's page appears with "Reload". In the application panel, the
`bhojnalya.device` key and the `bhojnalya-pos` database are still there after
the page shows and after pressing "Reload". Unblock the request and press
"Reload": the counter's screen opens.

## Coverage

- `a screen that fails to load › shows the branded fallback with a reload on the %s, not the router error page` (component; `kds`, `pos`)
- `a screen that fails to load › keeps unsynced changes and the device role when the fallback shows and reloads` (component)
- A screen that fails while rendering: the same boundary covers it, but it
  has no test of its own: **GAP**.
- The real browser reload after a chunk failure, offline with the service
  worker: **GAP**, no e2e yet; checked by hand (Procedure).

Command: `pnpm --filter @bhojnalya/app test`

## References

- [app 0103 A device shows only the screens of the role it was registered for](./0103-a-device-shows-only-the-screens-of-the-role-it-was-registered-for.md)
- [app 0205 A till with unsynced changes cannot be cleared, and always says how many](./0205-a-till-with-unsynced-changes-cannot-be-cleared-and-always-says-how-many.md)
- [ADR 0022 A new version of the till takes over only on its next launch](../../../../docs/decisions/0022-a-new-version-of-the-till-takes-over-only-on-its-next-launch.md)
