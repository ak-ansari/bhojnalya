# 10 POS/KDS app shell (apps/app)

Status: resolved
Type: task
Blocked by: 02
Workspaces: apps/app, packages/ui

## What

The empty but real React 18 + Vite PWA (TRD §4.2). Load `web-code`. Look at `design/ui-board/project/Foundations.dc.html` and `Main.dc.html` for tokens and layout.

## Acceptance

- Vite + React 18 + TS, `vite-plugin-pwa` precaching the shell, Tailwind (preset from packages/config) + shadcn/Radix in `packages/ui`.
- Router with role-based route groups `/pos/*` and `/kds/*`, a stub login/device-registration screen.
- TanStack Query, Zustand, `react-i18next` with all strings in `en` resources, `formatINR(paise)` via `Intl.NumberFormat('en-IN')`.
- `socket.io-client` wrapper that invalidates queries on reconnect (no real events yet).
- Online/offline banner component.
- Component tests (Testing Library + MSW) for the banner and `formatINR`.

## Comments

- **Tailwind**: `apps/app` is on **v4** (`@tailwindcss/vite`, `@config
  '@bhojnalya/config/tailwind'` in `src/index.css`, `@source` on
  `packages/ui/src`), as the coordinator asked. Admin is still on v3 with the
  same JS preset. The preset now carries the Foundations tokens, so admin
  picks up the new colour, radius, spacing and font-size names. One existing
  default changes for admin: `font-sans` is now DM Sans with a system
  fallback.
- **Menu token clash**: menu's own `@theme` defines `--color-ink` (#1B2230),
  `--color-line` (#EEF0F4) and `--color-surface` (#FAFAF9). The preset defines
  `ink` (#1E2638, the dark rail colour), `line` (#E3E6EB) and `surface`
  (#FFFFFF). Menu's `@theme` wins today (checked in its built CSS), so menu
  looks the same, but the names mean different things. When menu switches
  to the preset, map its `ink` to the preset's `fg` and check `line` and
  `surface`.
- **formatINR**: `packages/ui` exports `formatINR(paise: bigint)`. Its
  behaviour matches admin's local copy: Indian grouping, always two
  decimals, minus before ₹, bigint maths only. Menu's local copy drops
  `.00` on whole rupees (`₹150`), so menu can't switch to the shared one
  without a visible change. That's fine under ADR 0013, which lets the
  guest menu keep its own copy.
- **Platform test-case index**: `packages/ui` now has a catalogue
  (`packages/ui/docs/test-cases/`, cited as `ui NNNN`). Its row belongs in
  `docs/test-cases/index.md`, which this ticket may not edit.

## Answer

**Summary.** `apps/app` is now a React 18 + Vite 7 PWA. `vite-plugin-pwa`
precaches the shell (JS, CSS, HTML, the icon) and runtime-caches the Google
fonts. API and socket paths are never cached. Tailwind v4 loads the shared
preset. A data router has one lazy route tree per role: `/pos`
and `/kds` are separate chunks, so a KDS never downloads the POS layout.
`/register` is the stub device registration: pick billing counter or
kitchen display. A Zustand store keeps that choice in localStorage. Each
provider tree gets its own store through context, so tests never share
state. Also built:

- TanStack Query, and react-i18next with every string in
  `src/locales/en/translation.json`.
- A typed staff socket (`Socket<SocketEventListeners>` from contracts) and
  `refetchOnReconnect`, which invalidates every query on each `connect`.
- An offline strip: billing copy on the POS, reconnecting copy on the KDS,
  using the design's text.
- `ScreenShell` (rail, top bar, strip, page).
- `renderWithProviders` and `renderApp`, which build a fresh query client
  (`retry: false`), store, i18n and memory router, with no socket.
- MSW with `onUnhandledRequest: 'error'`.

`packages/ui` exports `formatINR`, `cn` (tailwind-merge v3, which knows the
preset's font sizes and radii), `Button` (shadcn/cva + Radix Slot, at least
48 px, defaults to `type="button"`) and `Banner`. React is a peer dependency.

**Decisions.**
- ADR 0022 (Proposed): a new version of the till takes over only on its
  next launch. The service worker uses `registerType: 'prompt'` and shows
  no prompt UI yet, so the app never reloads mid-bill.
- Versions are pinned to lines that work with Vitest 3.2.7 and React 18:
  Vite 7.3.7, plugin-react 5, vite-plugin-pwa 1.3, React Router 7, i18next
  25 / react-i18next 15, MSW 2, jest-dom 6.9.1 (6.10.0 is deprecated), jsdom
  26, tailwind-merge 3.
- The socket refetches on **every** connect, including the first, because a
  till that started offline has failed queries.
- The online flag is `navigator.onLine` only. The strip shows a down link,
  not an unreachable API.

**Notes for later tickets.**
- Device pairing should replace the `register` stub with owner sign-in and
  a device token, and pass the token into `connectStaffSocket` (auth is not
  sent yet). It should also call `navigator.storage.persist()`.
- The local-first POS adds Dexie to `renderWithProviders` (fake-indexeddb)
  and the outbox count to the offline strip.
- An update-ready prompt (ADR 0022) is still needed for urgent fixes.
- `API_ENDPOINTS` holds only the sync paths. Add each resource there, and
  read it from the MSW handlers.
- PWA icons are a single SVG. Add PNG 192/512 and maskable icons before a
  real install test on iPad.

**Verification.** `pnpm turbo build typecheck lint test --force` and
`pnpm format:check` pass. App: 16 tests. UI: 9 tests. Each new test was
seen red by breaking its code on purpose. I ran `vite` and loaded the page
in Chrome: `/register` renders the set-up card, and `/pos` with the network
off renders the rail, top bar and offline strip.

**Proposed `docs/log.md` line.**
`- **Creation**: apps/app is a React 18 + Vite PWA shell: Tailwind v4 on the shared preset (now carrying the Foundations tokens), lazy role route trees /pos and /kds, stub device registration, TanStack Query, Zustand, i18n, a staff socket that refetches on every connect, and an offline strip (ticket 10). packages/ui exports formatINR, cn, Button and Banner. Cases app 0101–0103 and ui 0101–0102. ADR 0022: a new version of the till takes over only on its next launch.`
