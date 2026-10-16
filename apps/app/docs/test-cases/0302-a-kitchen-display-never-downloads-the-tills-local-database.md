---
type: Test Case
title: "302. A kitchen display never downloads the till's local database"
description: Keeps the kitchen display's download small, and makes sure the till still has its database before its first local write.
tags: [test-cases, shell, bundle, local-db]
status: Proposed
origin_repo: bhojnalya
timestamp: 2026-10-16T00:00:00Z
---

# 302. A kitchen display never downloads the till's local database

Date: 2026-10-16

## Status

Proposed

## Given

- The app as built for release.
- A device registered as the kitchen display, or as the billing counter
  ([app 0103](./0103-a-device-shows-only-the-screens-of-the-role-it-was-registered-for.md)).

## When

1. The app is built.
2. A kitchen display opens its screens.
3. A billing counter opens its screens, and the first of them writes to the
   device's own database.

## Then

- **Nothing a kitchen display downloads contains the local database
  library: not the part every device loads first, not the kitchen's screens,
  and not anything they load with them.** The kitchen is an online screen
  and never opens the database.
- **The build fails, naming the module and the part that carries it, if any
  change brings the database library or the counter's screens into what a
  kitchen display downloads.** A stray import is caught by the build, not by
  a reviewer.
- **The billing counter's screens get the device's own database before any
  of them renders, so the first write lands in it.** It is one database per
  page, the same for every counter screen.
- A test can hand the counter a database of its own, and the screens use
  that one instead.

## Variations

| Build | Kitchen download (gzip) | Database library in it |
| :-- | :-- | :-- |
| before the database moved into the counter's screens | 159.24 KB | yes, in the part every device loads |
| now | 126.57 KB | no; it is in a part only the counter loads |

## Procedure

### Setup

`pnpm install` at the repo root on Node 22.

### Run

`pnpm --filter @bhojnalya/app build`. To see the guard fail, add
`import '@/libs/local-db/db';` to `src/main.tsx` and build again.

### Verify

The build succeeds. In `apps/app/dist/assets`, the string `DatabaseClosed`
appears only in the chunk the counter's layout imports (today
`useOutboxCounts-*.js`), not in `index-*.js` or any `Kds*.js` chunk. With the
extra import, the build fails with "The KDS would download modules it must
not: …dexie…". Then register a tablet as the billing counter and open
`/pos`: the top bar shows "All synced", and the `bhojnalya-pos` database
appears in the browser's application panel.

## Coverage

- The real build output: the bundle guard in the app's build, which fails the
  `build` task (seen red on the old code: Dexie in the entry chunk).
- `forbiddenInKdsChunks › finds the local database in the entry chunk every device loads` (unit)
- `forbiddenInKdsChunks › finds it in a chunk a KDS route imports statically` (unit)
- `forbiddenInKdsChunks › allows them in chunks only the POS loads` (unit)
- `LocalDbScope › opens this device's database for the first screen's write when none is provided` (component)
- `LocalDbScope › gives every POS screen on the page the same instance` (component)
- `LocalDbScope › uses a database provided above it instead` (component)
- The kitchen download size: measured by hand from the build (Variations);
  no budget is enforced.

Command: `pnpm --filter @bhojnalya/app test` and `pnpm --filter @bhojnalya/app build`

## References

- [app 0103 A device shows only the screens of the role it was registered for](./0103-a-device-shows-only-the-screens-of-the-role-it-was-registered-for.md)
- [app 0201 An invoice, its number and its sync change are saved together or not at all](./0201-an-invoice-its-number-and-its-sync-change-are-saved-together-or-not-at-all.md)
- [ADR 0006 The till is local-first; the kitchen and guests are online](../../../../docs/decisions/0006-the-till-is-local-first-the-kitchen-and-guests-are-online.md)
- [ADR 0013 The till and the kitchen are one app; the guest menu is another](../../../../docs/decisions/0013-the-till-and-the-kitchen-are-one-app-the-guest-menu-is-another.md)
