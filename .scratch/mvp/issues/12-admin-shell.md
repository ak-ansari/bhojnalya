# 12 Admin app shell (apps/admin)

Status: resolved
Type: task
Blocked by: 02
Workspaces: apps/admin

## What

Owner portal + super admin shell. Load `web-code`. Designs: `OwnerDashboard`, `OwnerMenu`, `OwnerReports`, `AdminConsole` in `design/ui-board/project/`.

## Acceptance

- Vite + React 18, router with `/owner/*` and `/platform/*` groups, layout and nav, login screen stub.
- TanStack Query, react-hook-form + zod resolver wired, i18n, `formatINR`.
- Red impersonation banner component driven by a token claim (TRD §13).
- One component test per screen stub.

## Comments

- **Move to `packages/ui` once ticket 10 lands**: `formatINR`
  (`apps/admin/src/libs/utils/formatINR.ts`), `TextField`
  (`src/modules/auth/components/TextField.tsx`), `AppShell`, `StubPage` and
  `ImpersonationBanner` (`src/libs/components/`). Move `formatINR` with its
  tests; the POS and QR menu need the same formatter.
- **Move to `packages/contracts`**: the access-token claim shape
  (`AccessClaims` in `src/libs/auth/accessClaims.ts`: `sub`, `tenant_id`,
  `scope`, `impersonated_by`). The API ticket that issues tokens should own
  it, and the admin should import it.
- **Tailwind**: v3 with the shared preset (`@bhojnalya/config/tailwind`).
  The preset is a stub here, so the admin uses Tailwind's default palette
  for now: `orange-700` = #C2410C (the brand), `red-700` = #B91C1C (the
  banner), `slate-*` for the nav. Swap in the token names when ticket 10's
  preset lands. If ticket 10 picks Tailwind v4, the admin's
  `tailwind.config.js`/`postcss.config.js` need to follow.
- **Session**: the access token is held in a React context, in memory only,
  not in Zustand. Zustand isn't installed yet. Swap it in with the real auth
  ticket if the team wants one store per app.
- **ESLint**: `apps/admin/eslint.config.js` adds `eslint-plugin-react-hooks`
  on top of the shared config. It belongs in `packages/config` for all three
  web apps; I didn't edit it here.
- **MSW is not installed.** No screen fetches yet. Add it with
  `API_ENDPOINTS` when the first endpoint lands. Its postinstall may need an
  `onlyBuiltDependencies` entry in the root `pnpm-workspace.yaml`.

## Answer

`apps/admin` is now a Vite + React 18 app. The script names are unchanged:
`build` runs `vite build`; `typecheck`, `lint` and `test` are as before. `dev`
and `preview` are new.

- **Routing** (React Router 7, data router): `/login`; `/owner/*` holds
  dashboard, menu and reports; `/platform/*` holds outlets; there is a
  not-found page. `/` and `/owner` redirect to the owner dashboard, and
  `/platform` redirects to outlets. Each group has its own `AppShell` and
  nav, and the active link is marked `aria-current`. Touch targets are at
  least 44 px.
- **Wiring**: `AppProviders` wraps TanStack Query (`createQueryClient`),
  i18next (`createI18n`, English bundled and initialised synchronously,
  keys by module under `src/locales/en/`) and `SessionProvider`.
  `renderWithProviders(url, { accessToken })` renders the real route tree
  in a memory router with fresh providers and `retry: false`.
- **Login stub**: react-hook-form + `zodResolver`, `mode: 'onTouched'`. The
  identifier is an email or a 10-digit Indian mobile; the password is at
  least 8 characters. Each field's error replaces its hint in a
  fixed-height line, and a failed submit focuses the first invalid field.
  A valid submit says nothing was sent, because there is no auth API yet.
- **Impersonation banner**: `decodeAccessClaims` reads the JWT payload
  (base64url, Zod-validated; display only, the server verifies). The red
  `ImpersonationBanner` sits inside `AppShell`, so every screen shows it
  whenever the token carries `impersonated_by`. "Exit view-as" drops the
  token and goes to `/platform/outlets`.
- **`formatINR(paise: bigint)`**: Indian grouping and two decimals using
  bigint division, with no float involved.
- **Screen stubs**: `OwnerDashboardPage`, `OwnerMenuPage`,
  `OwnerReportsPage` and `PlatformOutletsPage` show a title plus an
  empty-state sentence. Data comes in later tickets.
- **Tests**: 38 tests (unit and component), each new test seen red by
  breaking the code. Cases `admin 0001`–`0004` are in
  `apps/admin/docs/test-cases/`.

Decisions: no ADR. The choices a reviewer might question are listed under
Comments: Tailwind v3 with the default palette for now, the session in a
React context, the react-hooks lint plugin added locally, and no MSW yet.

Notes for later tickets:

- The auth API ticket owns the claim shape. Move `AccessClaims` to
  `packages/contracts` and add a route guard.
- The platform_admin ticket should make "Exit view-as" end the session on
  the server.
- The production bundle is about 140 KB gzipped JS. The admin has no budget,
  but route-level `lazy()` is an easy win later.

Proposed `docs/log.md` line (under the current date heading):

```
- **Creation**: `apps/admin`: Vite + React 18 shell with `/owner/*` and
  `/platform/*` route groups, a login stub (react-hook-form + Zod), TanStack
  Query and i18n wiring, `formatINR`, and the red impersonation banner driven
  by the token's `impersonated_by` claim (ticket 12). Cases `admin 0001`–`0004`.
```
