# MVP build: spec and ticket map

The Phase 1 MVP as described in `docs/BHOJNALYA_TRD.md`, split into tickets an
agent can pick up alone. The TRD and PRD are the spec. This file only orders
the work.

## Rules for every ticket

- Read `CLAUDE.md` first. The ten invariants there aren't up for negotiation.
- Load the skill for the workspace you touch: `billing-engine`, `api-code`,
  `web-code`, plus `test-case` for every behaviour change.
- Stay inside the workspace(s) the ticket names. If you need a change in
  another workspace, say so in `## Comments` and don't make it.
- Each ticket ships with its test cases in the workspace catalogue
  (`<workspace>/docs/test-cases/`) and an entry in `docs/log.md`.
- A choice a reviewer could argue with gets an ADR (`adr` skill).
- Conventional Commits, one commit per ticket or a few, no AI attribution.

## Waves (from the Blocked-by lines)

| Wave | Tickets |
| :-- | :-- |
| 0 | 01 scaffold |
| 1 | 02 contracts, 03 billing totals, 04 numbering, 05 db tenancy+RLS, 06 infra, 07 CI |
| 2 | 08 api skeleton, 09 db domain tables, 10 app shell, 11 menu shell, 12 admin shell |
| 3 | 13 auth+devices, 16 POS local store, 24 Tailwind alignment |
| 4 | 14 platform admin, 15 menu API, 17 sync API |
| 5 | 18 POS screens, 23 owner/admin screens |
| 6 | 19 KOT+KDS, 22 reports |
| 7 | 20 QR ordering, 21 aggregators |
| QA 1 | 27 billing (now), 25 db + 26 api + 29 admin (after 13), 28 POS shell (after 16) |

## Decisions so far

(Resolved tickets append a one-line gist + link here.)

- 01: pnpm 10 + Turborepo 2 on Node 22; shared config in `packages/config`; library packages compile to `dist/` so tasks depend on `^build`. [ticket](issues/01-scaffold-monorepo.md)
- 07: GitHub Actions runs format, lint, typecheck and test, then `test:int`, and a non-blocking audit. [ticket](issues/07-ci-workflow.md)
- 06: Compose with Postgres 16 and the roles `bhojnalya_owner` (migrations), `app_user` (API, no BYPASSRLS) and `platform_admin` (BYPASSRLS); tests reuse `infra/postgres/init/01-roles.sh`. [ticket](issues/06-infra-local-dev.md)
- 04: invoice numbers are exactly 16 chars; FY and business date use a fixed IST offset (ADR 0016). [ticket](issues/04-billing-invoice-numbering.md)
- 02: paise are digit strings on the wire (ADR 0018); tax rates are basis points (`taxRateBp`); JSON keys are camelCase (the skill's snake_case conflict is still open). [ticket](issues/02-contracts-core.md)
- 05: `withTenant` + `app.enable_tenant_rls`; explicit per-table grants; pre-auth lookups via SECURITY DEFINER (ADR 0019). [ticket](issues/05-db-tenancy-identity-rls.md)
- 03: `computeInvoice` takes contract-shaped lines (`taxRateBp`); discount comes off taxable value, service charge on what remains (ADR 0017). Property suite has a 60 s timeout because it flakes under load. [ticket](issues/03-billing-engine-totals.md)
- 12: admin is Vite + React Router 7 + Tailwind v3 (to move to v4); keeps a local `formatINR` and session context. [ticket](issues/12-admin-shell.md)
- 11: menu is Vite + React + wouter + Tailwind v4; 67 KB of the 120 KB budget is used, and TanStack Query + socket.io + zod will make it tight (ADR 0023). [ticket](issues/11-menu-shell.md)
- 09: every domain table is outlet-scoped; snapshots have no FK to the menu; KOT numbers are per device per business date; aggregator store lookup happens before sign-in (ADR 0021); there are no DB format CHECKs on text columns yet. [ticket](issues/09-db-domain-tables.md)
- 10: `apps/app` on Vite 7 + Tailwind v4 + React Router 7 + Zustand; tokens are in the shared preset; `packages/ui` has `formatINR`/`Button`/`Banner`; the SW only updates on next launch (ADR 0022); offline means `navigator.onLine` only. [ticket](issues/10-app-pwa-shell.md)
- 08: interceptor order is tenant tx → suspension → idempotency; routes fail closed unless `@Public()`; an Idempotency-Key is optional server-side (POS/QR clients must still send one); pg-boss runs as `app_user` and is installed by the owner (ADR 0020). [ticket](issues/08-api-skeleton.md)
- 24: all three apps use Tailwind v4 + the shared preset. The preset still lacks diet colours, `line.soft`, the guest page colour and `on-*` text tokens (see the ticket's Comments). [ticket](issues/24-align-tailwind-v4-tokens.md)
- 16: the outbox stores ops in wire form (ADR 0025); a refused op is held for a person, so the server sees `deviceSeq` holes; clearing data unpairs the device; `assertOutboxEmpty` must guard any future logout. [ticket](issues/16-pos-local-store-outbox.md)
