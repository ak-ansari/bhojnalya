# 24 Put admin and menu on Tailwind v4 and the shared tokens

Status: resolved
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

## Comments

Tokens the preset (`packages/config/tailwind/preset.js`) lacks. This ticket
couldn't edit the preset, so each one is handled locally for now:

- **Diet marks.** Foundations and QrMenu define the veg / egg / non-veg
  colours, but the preset has no diet set. Menu keeps them in its own
  `@theme`: `veg` #15803D, `veg-line` #BBE5C8, `veg-tint` #E8F7EE, `veg-ink`
  #166534, `egg` #CA8A04, `egg-line` #A16207 and `non-veg` #7C2D12. The POS and
  the owner's menu screen will need the same marks. Proposal: add
  `diet: { veg, 'veg-line', 'veg-tint', 'veg-ink', egg, 'egg-line', 'non-veg' }`
  to the preset, then delete menu's copies.
- **Soft divider.** QrMenu draws its header rule and dish dividers in #EEF0F4.
  In the preset that value is only `surface.muted`; `line` is #E3E6EB, which is
  darker. Menu uses `border-surface-muted` to keep the design's colour.
  Proposal: add `line.soft: '#EEF0F4'` and switch those two borders to it.
- **Guest page background.** QrMenu's page is #FAFAF9. The preset has no such
  colour, so menu now uses `surface-sunken` (#FAFBFC). The difference is at most
  3 per channel. If the design wants #FAFAF9 exactly, it needs a token.
- **Text on a filled colour.** White text on `saffron`, `ink`, `danger` and
  `brand` still uses Tailwind's `text-white`. The preset has no `on-*` token.
- **Not done here:**
  - Admin's font stack is the preset's DM Sans, but admin doesn't load the
    webfont (`apps/app` loads it from Google Fonts), so it renders in
    `system-ui`. That's unchanged from before.
  - Tailwind v4's preflight sets `cursor: default` on buttons; v3 used
    `pointer`. This only shows with a mouse.

## Answer

**Summary.** `apps/admin` is on Tailwind v4, wired the same way as `apps/app`:
`@tailwindcss/vite` in `vite.config.ts`, plus `@import 'tailwindcss'` and
`@config '@bhojnalya/config/tailwind'` in `src/index.css`. I removed
`tailwind.config.js`, `postcss.config.js` and the `postcss` dependency. There's
no `@source` for `packages/ui`, because admin doesn't use it yet. Every
default-palette stand-in is now a preset token:

| Before | After |
| --- | --- |
| `orange-700` | `saffron` |
| `red-700` | `danger` |
| `slate-50` | `canvas` |
| `slate-900` | `fg` |
| `slate-800` / `slate-700` / `slate-300` on the rail | `ink` / `ink-raised` / `ink-soft` |
| `slate-600` | `fg-body` |
| `slate-500` | `fg-muted` |
| `slate-200` | `line` |
| `slate-300` on inputs | `line-strong` |
| `white` | `surface` |

The banner test now asserts `bg-danger`; I saw it fail against `bg-red-700`.

`apps/menu`'s `@theme` dropped `ink`, `muted`, `line`, `chip-line` and
`surface`:

| Before | After | Colour |
| --- | --- | --- |
| `ink` | `fg` | #1B2230, unchanged |
| `muted` | `fg-muted` | unchanged |
| `chip-line` | `line` | #E3E6EB, unchanged |
| `line` (the #EEF0F4 dividers and the Unavailable pill) | `surface-muted` | unchanged |
| `bg-white` | `surface` | unchanged |
| page `surface` | `surface-sunken` | #FAFAF9 becomes #FAFBFC, see Comments |

Menu still defines `brand`, the system font stack (no webfont on 4G) and the
diet-mark colours, which the preset doesn't have (see Comments). Menu's
`formatINR` is untouched. No test case changed, because no tested behaviour
changed. No ADR.

**Sizes** (production build, gzip -9 for CSS):

| | Before | After |
| --- | --- | --- |
| Menu JS, gzipped (budget 120,000 B) | 67,030 B | 67,036 B |
| Menu CSS | 10,161 B raw / 2,867 B gz | 9,990 B raw / 2,847 B gz |
| Admin CSS | 7,463 B raw / 2,035 B gz | 6,527 B raw / 2,140 B gz |
| Admin JS, gzipped | 139.72 kB | 139.72 kB |

**Visual check.** I ran both Vite dev servers and opened admin `/login`,
admin `/owner/dashboard` and menu `/t/demo-token` in Chrome at 768×1024 and
390×844. At each page and size I took a screenshot and dumped the computed
colour, background, border, font, size, radius, padding and box size of every
element, once before the change and once after. Then I diffed the dumps.

- **Menu:** identical at both widths except the page background, which moved
  from rgb(250,250,249) to rgb(250,251,252). Fonts, sizes, borders and text
  colours are all identical.
- **Admin:** layout, fonts and sizes are identical. The colours change on
  purpose, from Tailwind's slate stand-ins to the design tokens:
  - Rail: #1E293B becomes #1E2638.
  - Rail text: #CBD5E1 becomes #AEB6C6.
  - Page: #F8FAFC becomes #F4F5F7.
  - Text: #0F172A becomes #1B2230.
  - Body copy: #475569 becomes #3B4456.
  - Hint: #64748B becomes #5B6577.
  - Input border: #CBD5E1 becomes #D9DDE4.
  - Card border: #E2E8F0 becomes #E3E6EB.
  - Saffron (#C2410C) and danger (#B91C1C) are exactly the old orange-700 and
    red-700.
- **v4 preflight:** inputs became transparent, so the input now sets
  `bg-surface` to stay white. Zero-width borders now default to
  `currentColor`, which can't be seen. Buttons get `cursor: default`.

**Verification.** `pnpm turbo build typecheck lint test --force
--concurrency=4` and `pnpm format:check` pass. Admin: 38 tests. Menu: 21 tests.

**Proposed `docs/log.md` line.**
`- **Change**: apps/admin moves to Tailwind v4 on the shared preset (@tailwindcss/vite + @config; v3 config and PostCSS removed) and uses token names in place of its slate/orange/red stand-ins; apps/menu drops the @theme colours the preset already has (its ink is the preset's fg) and keeps only brand, the system font and the diet marks (ticket 24). Menu JS 67,036 B gzipped; CSS 9,990 B (was 10,161 B).`
