# 24 Put admin and menu on Tailwind v4 and the shared tokens

Status: ready-for-agent
Type: task
Blocked by: 10, 11, 12
Workspaces: apps/admin, apps/menu (styles only)

## What

Tickets 10–12 ended up on different Tailwind versions and token sets. Ticket 10 filled `packages/config/tailwind/preset.js` with the Foundations tokens, on v4. Admin is still on v3; menu is on v4 but defines its own `@theme`, and its `ink`, `line` and `surface` mean something different from the preset's.

## Acceptance

- `apps/admin` on Tailwind v4 the way `apps/app` does it (`@tailwindcss/vite`, `@config` the preset); its v3 `tailwind.config`/PostCSS files are removed; the `orange-700`/`red-700` stand-ins become preset token names.
- `apps/menu` drops the `@theme` colours the preset already has, maps its `ink` to the preset's `fg` (see ticket 10's Comments), and keeps only the guest-specific tokens (brand). It keeps its local `formatINR`, which drops `.00` on purpose (ADR 0013).
- Menu's gzipped JS stays under budget, and its CSS is no bigger than it is today.
- No visual regression: compare screenshots of admin's dashboard and login and menu's `/t/:token` before and after, at tablet and phone widths.
- `pnpm check --force` passes.
