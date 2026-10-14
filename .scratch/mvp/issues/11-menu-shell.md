# 11 QR menu app shell (apps/menu) with bundle budget

Status: resolved
Type: task
Blocked by: 02
Workspaces: apps/menu

## What

The separate guest app (TRD §10, ADR 0013). Load `web-code`. Design: `design/ui-board/project/QrMenu.dc.html`.

## Acceptance

- Vite + React (or the Preact compat build if needed to hit budget, with an ADR), route `/t/:qrToken`.
- Branding through CSS variables.
- A build step that **fails** if the gzipped JS is over 120 KB, run as part of `pnpm turbo build`.
- i18n set up; static placeholder menu rendered from a fixture.
- One component test.

## Answer

`apps/menu` is now a Vite 7 + React 18 app. The guest menu JS is **67,030 B gzipped**, against a budget of 120,000 B.

- **Route** `/t/:qrToken` renders the design's menu screen: header with logo disc, outlet, table and a Veg only toggle; category chips; dish rows with veg/egg/non-veg marks, price, description and sold-out "Unavailable". Every other path shows a "This link isn't a table's menu" page. Routing uses `wouter` with a memory location in tests.
- **Branding**: `brandingStyle()` sets `--brand` on the page root from the menu's `primaryColor`. Anything that isn't `#RRGGBB` falls back to `#6B3A1F`. Tailwind v4 maps `--color-brand` to `var(--brand)` (`@theme inline`), so `bg-brand` and the rest follow it at runtime.
- **Budget**: `scripts/jsBudget.ts` is a Vite plugin. It gzips every emitted JS chunk, sums them, prints the total and fails `vite build` above 120,000 B. That fails `pnpm turbo build` too: inflating the bundle to 127,881 B failed the turbo build, and then I restored it.
- **i18n**: `react-i18next` with one fresh instance per render (`createI18n()`). Every string is in `src/locales/en/translation.json`.
- **Fixture**: `modules/menu/api/placeholderMenu.ts` (amounts in `bigint` paise), served by `useMenu()`, which is the seam the menu API fills.
- **Local** `formatINR(paise: bigint)`: `Intl.NumberFormat('en-IN')` fed an exact decimal string, so there is no float, and it uses `stripIfInteger` (`₹150`, `₹130.50`). Kept local per ADR 0013; nothing here depends on `packages/ui`.
- **Tests**: 21 total. Unit: `formatINR`, `brandingStyle`, `jsBudget`. Component: `MenuPage.test.tsx`, run through the real `App` at a path. Each one was seen red under a deliberate mutation. Cases are `menu 0001`–`0005` in `apps/menu/docs/test-cases/`.

### Decisions

- **ADR 0023 (Proposed)**: full React rather than Preact compat (it fits with about 53 KB to spare); a minimal router rather than React Router; the budget is the **sum of all emitted chunks** in **decimal** KB, so lazy chunks count and the check errs strict.
- Tailwind **v4** via `@tailwindcss/vite`, loading the shared preset with `@config '@bhojnalya/config/tailwind'`. The preset is still a stub, so the guest tokens (ink, muted, line, veg/egg/non-veg…) are defined in `src/styles.css` `@theme`.
- Touch targets are 44 px (chips, toggle), larger than the design's 36 px, following the `web-code` rule.
- No webfont: the system font stack is used, because DM Sans would add a blocking request on 4G.
- `typecheck` is `tsc && tsc -p tsconfig.node.json`. The config files sit in a separate tsconfig because typescript-eslint refuses a file that is both in the project and in the shared `allowDefaultProject`.
- The ADD/stepper, search and customise sheet from the design are **not built** (cart is ticket 20).

### Notes for later tickets

- Budget left: about 53 KB. TanStack Query, `socket.io-client` and `zod` (via `@bhojnalya/contracts`) together are about 35–40 KB. Consider `zod/mini` or a hand decoder in the guest app if it gets tight. Preact compat is the next lever (needs an ADR).
- Ticket 15/20: replace `useMenu()` with a TanStack Query hook keyed on the route's `qrToken` (`useParams` from `wouter`), and parse with the contracts schema. `GuestMenu` in `domain/menu.ts` is a local stand-in. Diet is `'veg' | 'egg' | 'non_veg'`; align it with whatever contracts adopts.
- When the shared Tailwind preset gains tokens (ticket 10), move the menu's `@theme` colours there.
- E2E for the menu (Playwright) is a GAP.
- During one full `pnpm turbo … --force` run, `packages/billing` test reported "1 unhandled error" (likely a worker timeout under parallel load from its 55 s property suite). It passed alone and on the next full run.

### Proposed `docs/log.md` line

- 2026-10-14: ticket 11: `apps/menu` shell on Vite + React 18 with `/t/:qrToken`, CSS-variable branding, i18n and a build that fails over 120,000 B gzipped JS (today 67,030 B); ADR 0023; cases menu 0001–0005.
