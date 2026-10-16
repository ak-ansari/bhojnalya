# 28 POS shell: bad stored role and chunk-load failures (QA round 1)

Status: resolved
Type: bug
Blocked by: 16
Workspaces: apps/app

QA round 1 on development @ cdcf87a. Probes: `/private/tmp/claude-501/-Users-akansari-projects-bhojnalya/947da6ab-097f-41ff-891f-25d045e1c00f/scratchpad/ui/`. Each fix starts with a red test.

1. localStorage `bhojnalya.device` = `{"state":{"role":"admin"},"version":0}` (or role 123) shows a blank `/kds` with no way out. `roleHome()` maps any non-'pos' value to `/kds` and `RequireRole` never matches. Validate the persisted role with the contracts `DeviceRole` schema and fall back to `/register`.
2. No `errorElement`: a failed lazy chunk (offline, or a stale client after deploy) shows React Router's raw "Unexpected Application Error!". Add a branded, translated fallback that offers a reload, and never loses unsynced data (it must not clear storage).
3. (From ticket 16.) The KDS downloads Dexie (~28 KB gz) though it never opens the local DB, because the database is created in `main.tsx`. Create it lazily inside the POS route tree so the `/kds` chunk doesn't pull it. Prove it with a build-output check, not just by reading the code.

## Answer

**Summary.** All three bugs are fixed. Each fix was preceded by a test seen
red on the old code.

1. **Bad stored role.** The persisted device store now has a `merge` that
   keeps the stored role only if it is a known `DeviceRole`. Anything else
   becomes `null`, and an unregistered device goes to `/register` (unknown
   string, number, `{"state":null}`; text that is not JSON was already
   safe). When nothing is stored, the store keeps the role it was created
   with, which tests rely on. `DeviceRegistrationPage` now reads the same
   `DEVICE_ROLES` list.
   *Tests:* `createDeviceStore › treats a stored value with %s as
   unregistered` (4 rows), `createDeviceStore › accepts exactly the
   contract's device roles`, and `app routes › sends a device whose stored
   role is unknown to registration from %s, not a blank screen` (`/kds`,
   `/pos`, `/`). Before the fix, the `admin` rows timed out on a blank screen.
2. **No `errorElement`.** `appRoutes` is now one pathless root route with
   `errorElement: <RouteError />` around the old table. `RouteError` shows
   the brand, "This screen didn't load.", "Nothing saved on this tablet was
   lost. Check the internet, then reload." and a 48 px "Reload" button. The
   strings are under `common.routeError.*`, and the error is logged to the
   console. "Reload" calls `libs/browser/reloadPage` (`location.reload()`)
   and nothing else, so no storage is cleared.
   *Tests:* `RouteError.test.tsx` mocks the KDS and POS layout modules to
   fail on import. `a screen that fails to load › shows the branded fallback
   with a reload on the %s, not the router error page` (kds, pos) and
   `… › keeps unsynced changes and the device role when the fallback shows
   and reloads`: 2 outbox ops are still there and the role and localStorage
   are unchanged. Before the fix, React Router's default ErrorBoundary
   handled the error. A mutation that unregistered the device on reload
   turned the second test red.
3. **Dexie in the KDS download.** `main.tsx` no longer creates `PosDb`.
   `AppProviders.localDb` is now optional and only tests pass it. The new
   `libs/local-db/LocalDbScope` wraps `PosLayout`: it provides the
   database given above it, or else this device's own, one lazily created
   instance per page. Because it sits above `PosFrame`, where the sync
   runner and every POS screen live, the database exists before any local
   write. *Proof from the build:* a new Vite plugin, `src/bundle/kdsBundleGuard.ts`
   (in `vite.config.ts`, build only), walks the entry chunk, the chunks rooted
   at `src/modules/kds/` and their static imports in `generateBundle`. It
   **fails the build** if any of them contains `node_modules/dexie/` or a
   `src/modules/pos/` module. On the old code the build failed with "The KDS
   would download modules it must not: …dexie… (in assets/index-….js)". It
   passes now.
   *Tests:* `forbiddenInKdsChunks › …` (4 unit tests, seen red by dropping
   the import walk and by narrowing the roots) and `LocalDbScope › …`
   (3 component tests: the first write lands in `bhojnalya-pos`, the same
   instance on every POS screen, a provided database wins). These were seen
   red by not providing the database, by creating a new database per
   render, and by ignoring the provided one.

**KDS download** (entry + `Kds*` + their static imports, gzip, measured
from `dist/assets`):

| | entry | KDS total | Dexie in |
| :-- | --: | --: | :-- |
| before (5febd39) | 147.56 KB (+ 10.33 KB `Button` chunk) | **159.24 KB** | entry `index-*.js` |
| after | 125.26 KB | **126.57 KB** | `useOutboxCounts-*.js` only (POS-only; 27.17 → 59.28 KB) |

That is −32.7 KB gz. Dexie's minified file is 31.0 KB gz on its own.
`DatabaseClosed` and `__dbnames` appear only in the POS chunk. The ui
package (`Button`) moved into the entry because `RouteError` uses it, and
the KDS already downloaded it.

**Decisions to review.**

- **The role check does not call the contracts schema at runtime.** As the
  ticket asked, I first validated with `DeviceRole.safeParse`. That put zod
  and contracts into the entry chunk, so every device, the KDS included,
  downloaded them: the KDS total went to 153.04 KB, giving back 26.5 KB of the
  saving. Instead, `deviceStore` holds `DEVICE_ROLES = ['pos', 'kds']` (typed
  `readonly DeviceRole[]`) and `isDeviceRole`. A unit test asserts
  `DEVICE_ROLES` equals `DeviceRole.options` and that `isDeviceRole` agrees
  with `DeviceRole.safeParse` on good and bad values, so the contract stays
  the source of truth. Note for ticket 19: the KDS will likely need zod
  again once it parses API responses, and it should arrive in KDS chunks.
- The guard also forbids `src/modules/pos/` in the KDS's chunks. That closes
  app 0103's "no automated bundle check" GAP.
- The guard's source lives in `apps/app/src/bundle/`, so the app's own
  Vitest and tsconfig cover it. It is build tooling, not a feature module.
  It is not in `src/build/` because the root `.gitignore` ignores every
  `build/` directory.
- No ADR was written.

**Cases.** app 0103 is extended (bad stored role, automated bundle check).
New: app 0301 "A screen that fails to load offers a reload and loses nothing
saved on the device" and app 0302 "A kitchen display never downloads the
till's local database". Both are in the app's `index.md` under "Shell
robustness and download size". GAPs: no test of its own for a render-time
failure, and no e2e of the real offline reload.

**Proposed `docs/log.md` line.**

`- **Fix**: POS shell robustness from QA round 1 (ticket 28): a stored device role that is not pos/kds counts as unregistered and goes to set-up (no more blank /kds); one route errorElement shows a branded, translated "This screen didn't load." page whose Reload never clears storage; the till's Dexie database is created inside the POS route tree, and a build guard fails the build if the KDS's chunks contain Dexie or POS modules (KDS download 159.24 → 126.57 KB gz). Cases app 0301–0302; app 0103 extended and its bundle GAP closed.`
