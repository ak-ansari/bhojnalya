# Update Log

## 2026-10-14 — the domain tables, and the guest menu and admin shells

- **Creation**: `packages/db` migration `0002_domain_tables`: menu,
  ordering, kitchen, billing, aggregator, sync and reporting tables, all
  outlet-scoped under RLS. The financial tables, `sync_ops` and `kot_items`
  are insert and read only for `app_user` (ticket 09). Cases `db 0007`–`0014`.
  ADR 0021: an aggregator webhook can only learn which outlet its store
  belongs to.
- **Creation**: `apps/menu`: Vite + React guest menu shell on `/t/:qrToken`
  with outlet branding, and a build that fails above 120,000 B of gzipped JS
  (67,030 B today) (ticket 11). Cases `menu 0001`–`0005`. ADR 0023: full
  React, with every script counted.
- **Creation**: `apps/admin`: Vite + React owner and platform shell, a login
  stub, the view-as banner and `formatINR` (ticket 12). Cases
  `admin 0001`–`0004`.
- **Creation**: `apps/app`: Vite + React PWA shell for the POS and KDS,
  with lazy `/pos` and `/kds` route trees behind a role guard, an offline
  strip, and a staff socket that refetches on every connect (ticket 10).
  Cases `app 0101`–`0103`. ADR 0022: a new version of the till takes over
  only on its next launch.
- **Creation**: `packages/ui`: `formatINR`, `cn`, `Button` and `Banner`.
  Cases `ui 0101`–`0102`. The shared Tailwind preset now holds the
  Foundations design tokens.
- **Not changed**: admin is still on Tailwind v3, and menu's own `@theme`
  clashes with the preset's tokens. Ticket 24 aligns both.

## 2026-10-14 — contracts, invoice numbering, the tenancy schema, local Docker and CI

- **Creation**: `packages/contracts`: money, UUIDv7 ids, the error envelope,
  sync push/pull ops, socket events, shared enums and the sync-push fixture
  (ticket 02). Cases `contracts 0001`–`0006`. ADR 0018: money crosses the
  wire as a string of digits. Tax rates are basis points (`taxRateBp`).
- **Creation**: `packages/billing/src/numbering`: invoice number format and
  parse, the IST financial year, business date with the day-end cutoff, and
  the clock guard (ticket 04). Cases `billing 0101`–`0104`. ADR 0016: Indian
  time is a fixed offset, never the device's zone.
- **Creation**: `packages/db`: tenancy and identity schema with RLS forced on
  every tenant table, `withTenant`, and an isolation test that enumerates
  tables (ticket 05). Cases `db 0001`–`0006`. ADR 0019: a caller with no
  tenant can only learn which tenant holds its secret.
- **Creation**: `infra/docker-compose.yml`: Postgres 16 (TRD §15.2 tuning)
  with the `bhojnalya_owner`, `app_user` and `platform_admin` roles, Caddy
  proxying `/api` and `/socket.io`, and `pnpm db:up` / `db:down` (ticket 06).
- **Creation**: `.github/workflows/ci.yml`: format, lint, typecheck and test,
  then `test:int`, plus a non-blocking `pnpm audit`. Dependabot runs weekly
  (ticket 07).
- **Creation**: `packages/billing`: `computeInvoice` computes line tax,
  CGST/SGST, an order discount split by largest remainder, service charge
  and round-off, plus Bill of Supply for composition and unregistered
  outlets (ticket 03). Cases `billing 0001`–`0006`, nine golden files, the
  contracts fixture among them. ADR 0017: a discount comes off the taxable
  value, and service charge is charged on what remains.
- **Change**: the test-case catalogue table lists `packages/contracts` and
  `packages/db`.

## 2026-10-14 — the monorepo builds, typechecks, lints and tests

- **Creation**: pnpm 10 + Turborepo 2 workspace (`pnpm-workspace.yaml`,
  `turbo.json`, root `package.json`, `.nvmrc`). Node 22 is enforced with
  `engineStrict`. `test:int`, `test:contract` and `test:e2e` are uncacheable.
- **Creation**: `packages/config` — strict tsconfig bases (base, library,
  node, web) with `noUncheckedIndexedAccess`, a type-aware ESLint 9 flat
  config (`strictTypeChecked`), Prettier, a Vitest base that runs in UTC, and
  a Tailwind preset stub.
- **Creation**: the eight workspaces (`apps/{api,app,menu,admin}`,
  `packages/{billing,contracts,db,ui}`) each get a `package.json`, tsconfig,
  `src/index.ts` and one Vitest smoke test. No framework code.
- **Change**: `CLAUDE.md` "Repository status" lists the real commands;
  `.gitignore` covers dependencies, build output, caches and `.env`.

## 2026-10-14 — the five open stories are decided

- **Creation**: `GLOSSARY.md` at the root: Order, KOT, KOT number, Missed
  order, Invoice (Tax Invoice or Bill of Supply), Service charge, Suspension.
  "Bill" is UI copy only.
- **Creation**: ADR 0015, suspension stops new sales but never record-keeping.
  It settles the clash between S3's read-only rule and N2.
- **Change**: US-KDS-07, US-AGG-10, US-GST-12 and US-ADM-11 are decided and
  marked N. US-ACC-06 follows the TRD (password, plus an email code to
  reset) and is marked T. No `?` stories remain.
- **Not changed**: the PRD and TRD. TRD §22 Q3 and Q4 are answered in the
  stories, and Q1 (the middleware vendor) is still open.

## 2026-10-14 — agent skills know where issues, labels and decisions live

- **Creation**: `docs/agents/issue-tracker.md` (issues are local markdown
  under `.scratch/<feature>/`), `docs/agents/triage-labels.md` (the five
  default roles, recorded as a `Status:` line) and `docs/agents/domain.md`
  (single-context; ADRs are read from `docs/decisions/`, not `docs/adr/`).
- **Change**: `CLAUDE.md` gains an `## Agent skills` section pointing at them.

## 2026-10-14 — the record, the test levels and the house rules are set up

- **Creation**: the knowledge bundle (`docs/index.md`), modelled on ghatnaghar's
  (`solar-square/ghatnaghar`, `staging`): conventions, decisions, test-case
  catalogue, QA runs, requirements, and this log.
- **Creation**: five conventions adopted from ghatnaghar — newspaper ordering,
  ADR style, documentation layers, commit messages, testing levels. Testing
  levels is rewritten for this product: seven levels (unit, component,
  integration, contract, e2e, user story, QA), with the billing engine's
  stricter bar, RLS tested as the application role, `TZ=UTC` with IST asserted
  at the boundaries, and Turborepo's cache kept off every level that touches a
  real dependency.
- **Creation**: ADRs 0001–0014, backfilled from the TRD's key decisions and
  `CLAUDE.md`'s invariants. Where the TRD disagreed with itself, the ADR says
  which side it took: 0004 follows "stored and flagged, never dropped" over
  §6's "rejects or flags".
- **Creation**: 108 MVP user stories in ten groups and eight cross-app
  journeys, with 5 new (N) and 5 open (?) stories for the team to decide.
- **Creation**: skills `test-case`, `user-story`, `adr`, `web-code`,
  `api-code`, `billing-engine` in `.claude/skills/`.
- **Not changed**: the PRD and TRD. Four contradictions found while writing
  the stories and ADRs are listed as open stories (US-ADM-11 suspension vs.
  never dropping synced data, US-ACC-06 OTP login) or in ADR consequences,
  rather than by editing the design.
- **Not built**: no test cases, because there is no code — a case describes
  what the code does today. Every story's `Cov` is `—`.
